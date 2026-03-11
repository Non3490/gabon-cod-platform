import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/call-center/performance
 * Get call center agent performance metrics
 * ADMIN only
 */
export async function GET(request: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const period = parseInt(searchParams.get('period') || '7') // days
    const agentId = searchParams.get('agentId')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)
    startDate.setHours(0, 0, 0, 0)

    const agents = await db.user.findMany({
      where: { role: 'CALL_CENTER', isActive: true },
      select: { id: true, name: true, createdAt: true }
    })

    const performance = await Promise.all(
      agents.map(async (agent) => {
        // Get call logs for this agent within the period
        const callLogs = await db.callLog.findMany({
          where: {
            agentId: agent.id,
            createdAt: { gte: startDate }
          }
        })

        const orderIds = callLogs.map(c => c.orderId)
        const orders = await db.order.findMany({
          where: { id: { in: orderIds } }
        })

        const confirmed = orders.filter(o => o.status === 'CONFIRMED').length
        const cancelled = orders.filter(o => o.status === 'CANCELLED').length
        const noAnswer = callLogs.filter(c => c.comment === 'NO_ANSWER').length
        const busy = callLogs.filter(c => c.comment === 'BUSY').length
        const wrongNumber = callLogs.filter(c => c.comment === 'WRONG_NUMBER').length

        // Calculate confirmation rate
        const confirmationRate = orders.length > 0
          ? (confirmed / orders.length * 100).toFixed(1)
          : '0.0'

        // Calculate average calls per hour (assuming 8 working hours per day)
        const totalHours = period * 8
        const avgCallsPerHour = totalHours > 0
          ? (callLogs.length / totalHours).toFixed(1)
          : '0.0'

        return {
          agent,
          stats: {
            totalCalls: callLogs.length,
            uniqueOrders: orders.length,
            confirmed,
            cancelled,
            noAnswer,
            busy,
            wrongNumber,
            confirmationRate,
            avgCallsPerHour,
            callRate: period > 0 ? (callLogs.length / period).toFixed(1) : '0.0'
          }
        }
      })
    )

    // Sort by total calls descending
    performance.sort((a, b) => b.stats.totalCalls - a.stats.totalCalls)

    return NextResponse.json({
      data: performance,
      period,
      startDate,
      summary: {
        totalAgents: performance.length,
        totalCalls: performance.reduce((sum, p) => sum + p.stats.totalCalls, 0),
        totalConfirmed: performance.reduce((sum, p) => sum + p.stats.confirmed, 0),
        totalCancelled: performance.reduce((sum, p) => sum + p.stats.cancelled, 0),
        avgConfirmationRate: performance.length > 0
          ? (performance.reduce((sum, p) => sum + parseFloat(p.stats.confirmationRate as string), 0) / performance.length).toFixed(1)
          : '0.0'
      }
    })
  } catch (error) {
    console.error('Error fetching call center performance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
