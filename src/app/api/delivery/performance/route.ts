import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/delivery/performance
 * Get delivery man performance metrics
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
    const deliveryManId = searchParams.get('deliveryManId')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)
    startDate.setHours(0, 0, 0, 0)

    const deliveryMen = await db.user.findMany({
      where: { role: 'DELIVERY', isActive: true },
      select: { id: true, name: true, createdAt: true }
    })

    const performance = await Promise.all(
      deliveryMen.map(async (dm) => {
        // Get orders for this delivery man within the period
        const orders = await db.order.findMany({
          where: {
            deliveryManId: dm.id,
            updatedAt: { gte: startDate }
          }
        })

        const delivered = orders.filter(o => o.status === 'DELIVERED').length
        const returned = orders.filter(o => o.status === 'RETURNED').length
        const cancelled = orders.filter(o => o.status === 'CANCELLED').length
        const postponed = orders.filter(o => o.status === 'POSTPONED').length
        const inProgress = orders.filter(o =>
          ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status)
        ).length

        // Calculate total cash collected
        const deliveredOrders = orders.filter(o => o.status === 'DELIVERED')
        const totalCashCollected = deliveredOrders.reduce((sum, o) => sum + o.codAmount, 0)

        // Calculate delivery rate
        const deliveredOrReturned = delivered + returned
        const deliveryRate = deliveredOrReturned > 0
          ? (delivered / deliveredOrReturned * 100).toFixed(1)
          : '0.0'

        // Calculate average deliveries per day
        const avgDeliveriesPerDay = period > 0
          ? (delivered / period).toFixed(1)
          : '0.0'

        // Calculate average COD per delivery
        const avgCodPerDelivery = delivered > 0
          ? (totalCashCollected / delivered).toFixed(0)
          : '0'

        return {
          deliveryMan: dm,
          stats: {
            totalOrders: orders.length,
            delivered,
            returned,
            cancelled,
            postponed,
            inProgress,
            totalCashCollected,
            deliveryRate,
            avgDeliveriesPerDay,
            avgCodPerDelivery,
            completionRate: orders.length > 0
              ? ((delivered + returned) / orders.length * 100).toFixed(1)
              : '0.0'
          }
        }
      })
    )

    // Sort by total orders descending
    performance.sort((a, b) => b.stats.totalOrders - a.stats.totalOrders)

    return NextResponse.json({
      data: performance,
      period,
      startDate,
      summary: {
        totalDeliveryMen: performance.length,
        totalOrders: performance.reduce((sum, p) => sum + p.stats.totalOrders, 0),
        totalDelivered: performance.reduce((sum, p) => sum + p.stats.delivered, 0),
        totalReturned: performance.reduce((sum, p) => sum + p.stats.returned, 0),
        totalCashCollected: performance.reduce((sum, p) => sum + p.stats.totalCashCollected, 0),
        avgDeliveryRate: performance.length > 0
          ? (performance.reduce((sum, p) => sum + parseFloat(p.stats.deliveryRate as string), 0) / performance.length).toFixed(1)
          : '0.0'
      }
    })
  } catch (error) {
    console.error('Error fetching delivery performance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
