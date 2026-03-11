import { db } from '@/lib/db'

interface PriorityScore {
  orderId: string
  score: number
  agentId?: string
  isBlacklisted?: boolean
}

/**
 * Intelligent 6-Level Priority Queue Scoring System
 *
 * Priority Rules:
 * 1. Base: Assign to online agent with lowest current workload
 * 2. Customer has historical delivery rate > 60% (+500)
 * 3. Order has highest product count (bundle/consolidated) (+100 per item)
 * 4. Oldest order (by createdAt) (+1 per minute old)
 * 5. Order status is DOUBLE (-1000)
 * 6. Phone number is blacklisted (-2000)
 *
 * @param parentSellerId - If provided, filter orders to only this seller (for sub-users)
 */
export async function getPriorityQueue(parentSellerId?: string | null): Promise<PriorityScore[]> {
  // Get all NEW orders (filtered by parentSellerId if provided)
  const now = new Date()
  const whereClause: any = {
    status: 'NEW',
    OR: [
      { scheduledCallAt: null },
      { scheduledCallAt: { lte: now } } // Show orders with scheduled time that has passed
    ]
  }

  // Filter orders by parentSellerId for sub-users
  if (parentSellerId) {
    whereClause.sellerId = parentSellerId
  }

  const orders = await db.order.findMany({
    where: whereClause,
    select: {
      id: true,
      phone: true,
      createdAt: true,
      scheduledCallAt: true,
      seller: { select: { id: true, name: true } },
      items: {
        select: {
          productId: true,
          product: { select: { id: true, name: true, description: true } }
        }
      }
    }
  })

  // Get all online CALL_CENTER agents
  const agents = await db.user.findMany({
    where: {
      role: 'CALL_CENTER',
      isActive: true,
      agentSession: {
        lastSeen: { gte: new Date(now.getTime() - 60000) } // Online within 60 seconds
      }
    },
    select: {
      id: true,
      agentSession: { select: { lastSeen: true } }
    }
  })

  if (agents.length === 0) {
    // No agents online, return orders with base score only
    return orders.map(order => {
      const ageMinutes = Math.floor((now.getTime() - order.createdAt.getTime()) / 60000)
      const baseScore = ageMinutes // 1 point per minute

      return {
        orderId: order.id,
        score: baseScore,
        agentId: undefined
      }
    })
  }

  // Count current workload per agent (NEW orders assigned)
  const workloads = await Promise.all(
    agents.map(async (agent) => {
      const count = await db.order.count({
        where: {
          assignedAgentId: agent.id,
          status: 'NEW'
        }
      })
      return { agentId: agent.id, count }
    })
  )

  // Build priority scores
  const scoredOrders = await Promise.all(
    orders.map(async (order) => {
      let score = Math.floor((now.getTime() - order.createdAt.getTime()) / 60000) // Base: age in minutes

      // Priority 1: Online agent with lowest workload
      const sortedAgents = [...agents].sort((a, b) => {
        const workloadA = workloads.find(w => w.agentId === a.id)?.count ?? 999
        const workloadB = workloads.find(w => w.agentId === b.id)?.count ?? 999
        return workloadA - workloadB
      })
      const lightestAgent = sortedAgents[0]
      if (lightestAgent) {
        // Base score increases for orders assigned to busy agents
        const agentWorkload = workloads.find(w => w.agentId === lightestAgent.id)?.count ?? 0
        score += agentWorkload // Prefer lighter workloads
      }

      // Priority 2: Historical delivery rate > 60% (+500)
      const orderHistory = await db.order.findMany({
        where: { phone: order.phone },
        select: { status: true }
      })
      if (orderHistory.length >= 3) {
        const deliveredCount = orderHistory.filter(o => o.status === 'DELIVERED').length
        const deliveryRate = deliveredCount / orderHistory.length
        if (deliveryRate > 0.6) {
          score += 500
        }
      }

      // Priority 3: Highest product count (+100 per item)
      score += (order.items.length - 1) * 100

      // Priority 4: Oldest order (already calculated as base score)
      // +1 per minute is included in base score

      // Priority 5: DOUBLE status (-1000)
      const existingDouble = await db.order.findFirst({
        where: { phone: order.phone, status: 'DOUBLE' }
      })
      if (existingDouble) {
        score -= 1000
      }

      // Priority 6: Blacklisted phone (-2000)
      const blacklisted = await db.blacklist.findUnique({
        where: { phone: order.phone, isActive: true }
      })
      if (blacklisted) {
        score -= 2000
      }

      return {
        orderId: order.id,
        score,
        agentId: lightestAgent?.id
      }
    })
  )

  // Sort by score descending (highest first)
  scoredOrders.sort((a, b) => b.score - a.score)

  return scoredOrders
}

/**
 * Soft-lock an order for a specific agent for 5 minutes.
 * Returns false if already locked by another agent whose lock has not expired.
 */
export async function softLockOrder(orderId: string, agentId: string): Promise<boolean> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { lockedByAgentId: true, lockedAt: true }
  })

  if (!order) return false

  const now = new Date()
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)

  // If locked by a DIFFERENT agent within the last 5 min → reject
  if (
    order.lockedByAgentId &&
    order.lockedByAgentId !== agentId &&
    order.lockedAt &&
    order.lockedAt > fiveMinAgo
  ) {
    return false
  }

  await db.order.update({
    where: { id: orderId },
    data: { lockedByAgentId: agentId, lockedAt: now }
  })

  return true
}

/**
 * Release soft lock on an order (called after action is taken or timeout).
 */
export async function releaseLock(orderId: string): Promise<void> {
  await db.order.update({
    where: { id: orderId },
    data: { lockedByAgentId: null, lockedAt: null }
  })
}

/**
 * Assign order to an agent using priority queue
 */
export async function autoAssignOrder(orderId: string, parentSellerId?: string | null): Promise<string | null> {
  const scoredOrders = await getPriorityQueue(parentSellerId)

  // Find the order and its suggested agent
  const scoredOrder = scoredOrders.find(o => o.orderId === orderId)
  if (!scoredOrder || !scoredOrder.agentId) {
    // Fallback to simple assignment if no priority agent available
    return null
  }

  // Assign to the priority agent
  await db.order.update({
    where: { id: orderId },
    data: { assignedAgentId: scoredOrder.agentId }
  })

  return scoredOrder.agentId
}

/**
 * Get live call center stats per agent for admin overview.
 */
export async function getAgentStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const agents = await db.user.findMany({
    where: { role: 'CALL_CENTER', isActive: true },
    select: { id: true, name: true, email: true, agentSession: { select: { isOnline: true } } }
  })

  const stats = await Promise.all(agents.map(async (agent) => {
    const [assigned, resolved, confirmed, cancelled, callsMade] = await Promise.all([
      db.order.count({ where: { assignedAgentId: agent.id, status: 'NEW' } }),
      db.order.count({
        where: {
          assignedAgentId: agent.id,
          status: { in: ['CONFIRMED', 'CANCELLED'] },
          updatedAt: { gte: today }
        }
      }),
      db.order.count({
        where: {
          assignedAgentId: agent.id,
          history: { some: { changedById: agent.id, newStatus: 'CONFIRMED', createdAt: { gte: today } } }
        }
      }),
      db.callLog.count({ where: { agentId: agent.id, createdAt: { gte: today } } })
    ])
    return {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      isOnline: agent.agentSession?.isOnline ?? false,
      pendingLeads: assigned,
      resolvedToday: resolved,
      confirmedToday: confirmed,
      cancelledToday: cancelled,
      callsMadeToday: callsMade
    }
  }))

  return stats
}
