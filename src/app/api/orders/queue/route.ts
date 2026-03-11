import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getPriorityQueue } from '@/lib/agent-assign'
import { db } from '@/lib/db'

interface QueuedOrder {
  id: string
  trackingNumber: string
  customerName: string
  customerPhone: string
  customerAddress: string
  city: string
  productName: string
  productDescription?: string
  quantity: number
  codAmount: number
  status: string
  notes: string | null
  createdAt: string
  scheduledCallAt: string | null
  isBundle: boolean
  bundleGroupId: string | null
  itemNames: string[]
  itemCount: number
  sellerName?: string
  isBlacklisted: boolean
  callLogs: Array<{
    id: string
    attempt: string
    createdAt: string
  }>
}

// GET /api/orders/queue - Priority-sorted queue for call center
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Only call center agents can access priority queue
    if (user.role !== 'CALL_CENTER') {
      return NextResponse.json({ error: 'Call center only' }, { status: 403 })
    }

    // Get priority queue scores
    const scoredQueue = await getPriorityQueue(user.parentSellerId)
    const orderIds = scoredQueue.map(q => q.orderId)

    if (orderIds.length === 0) {
      return NextResponse.json({ orders: [] })
    }

    // Fetch full order details
    const orders = await db.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        seller: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, description: true } } }
        },
        callLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    // Build order list with bundle detection
    const queuedOrders: QueuedOrder[] = orderIds.map(orderId => {
      const order = orders.find(o => o.id === orderId)!
      const scoreEntry = scoredQueue.find(q => q.orderId === orderId)!

      // Bundle detection: order has multiple items OR same product with quantity > 1
      const isBundle = order.items.length > 1 || order.items.some(i => i.quantity > 1)

      // Build item names for display
      const itemNames = order.items.map(item => {
        const name = item.product.name
        const qty = item.quantity > 1 ? ` (x${item.quantity})` : ''
        return name + qty
      })

      // Primary product name (for backward compatibility)
      const primaryItem = order.items[0]
      const totalQuantity = order.items.reduce((sum, i) => sum + i.quantity, 0)

      return {
        id: order.id,
        trackingNumber: order.trackingNumber,
        customerName: order.recipientName,
        customerPhone: order.phone,
        customerAddress: order.address,
        city: order.city,
        productName: primaryItem.product.name,
        productDescription: primaryItem.product.description,
        quantity: totalQuantity,
        codAmount: order.codAmount,
        status: order.status,
        notes: order.note,
        createdAt: order.createdAt.toISOString(),
        scheduledCallAt: order.scheduledCallAt?.toISOString() ?? null,
        isBundle,
        bundleGroupId: order.bundleGroupId,
        itemNames,
        itemCount: order.items.length,
        sellerName: order.seller?.name,
        isBlacklisted: scoreEntry.isBlacklisted ?? false,
        callLogs: order.callLogs.map(log => ({
          id: log.id,
          attempt: log.attempt,
          createdAt: log.createdAt.toISOString()
        }))
      }
    })

    return NextResponse.json({ orders: queuedOrders })
  } catch (error) {
    console.error('Priority queue error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
