import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { getOrderNotifications, getNotificationStats, sendBulkNotifications, sendNotification } from '@/lib/notifications'

/**
 * GET /api/notifications
 * Get notification statistics or order logs based on query params
 */
export async function GET(request: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const orderId = searchParams.get('orderId')

  // If orderId is provided, get notification logs for that order
  if (orderId) {
    try {
      // Check permissions - SELLERs can only see their own order notifications
      if (user.role === 'SELLER') {
        const order = await db.order.findUnique({
          where: { id: orderId },
          select: { sellerId: true }
        })

        if (!order || order.sellerId !== user.id) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }

      const logs = await getOrderNotifications(orderId)

      return NextResponse.json({ data: logs })
    } catch (error) {
      console.error('Error fetching notification logs:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  // Otherwise, get notification statistics (ADMIN only)
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const days = parseInt(searchParams.get('days') || '30')

    const since = new Date()
    since.setDate(since.getDate() - days)

    const stats = await getNotificationStats(since)

    return NextResponse.json({
      data: stats,
      period: { days, since: since.toISOString() }
    })
  } catch (error) {
    console.error('Error fetching notification stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/notifications
 * Manually send notification for an order
 * ADMIN only
 */
export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { orderId, type, channel } = body

    if (!orderId || !type) {
      return NextResponse.json({ error: 'orderId and type are required' }, { status: 400 })
    }

    const order = await db.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const validTypes = ['ORDER_CONFIRMED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_RETURNED']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const result = await sendNotification(order, type, channel || 'SMS')

    return NextResponse.json({
      success: result.success,
      sid: result.sid
    })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
