import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/call-logs - Today's call logs for the current agent
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const logs = await db.callLog.findMany({
      where: {
        agentId: user.id,
        createdAt: { gte: today }
      },
      include: {
        order: {
          select: { trackingNumber: true, recipientName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const confirmedOrders = await db.order.count({
      where: {
        status: 'CONFIRMED',
        history: {
          some: {
            changedById: user.id,
            newStatus: 'CONFIRMED',
            createdAt: { gte: today }
          }
        }
      }
    })

    const cancelledOrders = await db.order.count({
      where: {
        status: 'CANCELLED',
        history: {
          some: {
            changedById: user.id,
            newStatus: 'CANCELLED',
            createdAt: { gte: today }
          }
        }
      }
    })

    const noAnswerCount = logs.filter(l => l.attempt === 'NO_ANSWER').length

    return NextResponse.json({
      logs: logs.map(log => ({
        id: log.id,
        orderId: log.orderId,
        orderTracking: log.order.trackingNumber,
        customerName: log.order.recipientName,
        attempt: log.attempt,
        comment: log.comment,
        createdAt: log.createdAt.toISOString()
      })),
      stats: {
        totalCalls: logs.length,
        confirmed: confirmedOrders,
        cancelled: cancelledOrders,
        noAnswer: noAnswerCount
      }
    })
  } catch (error) {
    console.error('Call logs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/call-logs - Create a call log
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const { orderId, attempt, comment } = body

    if (!orderId || !attempt) {
      return NextResponse.json({ error: 'Missing required fields: orderId, attempt' }, { status: 400 })
    }

    const callLog = await db.callLog.create({
      data: { orderId, agentId: user.id, attempt, comment }
    })

    return NextResponse.json({ callLog }, { status: 201 })
  } catch (error) {
    console.error('Call logs POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
