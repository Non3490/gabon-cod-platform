import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/admin/delivery-overview — live per-delivery-man stats
export async function GET(_req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const deliveryMen = await db.user.findMany({
      where: { role: 'DELIVERY', isActive: true },
      select: { id: true, name: true, email: true, phone: true }
    })

    const stats = await Promise.all(deliveryMen.map(async (dm) => {
      const [assigned, deliveredToday, returnedToday, postponedToday, cashToday, allOrders] = await Promise.all([
        db.order.count({ where: { deliveryManId: dm.id, status: 'SHIPPED' } }),
        db.order.count({ where: { deliveryManId: dm.id, status: 'DELIVERED', deliveredAt: { gte: today } } }),
        db.order.count({ where: { deliveryManId: dm.id, status: 'RETURNED', returnedAt: { gte: today } } }),
        db.order.count({ where: { deliveryManId: dm.id, status: 'POSTPONED', updatedAt: { gte: today } } }),
        db.order.aggregate({
          where: { deliveryManId: dm.id, status: 'DELIVERED', deliveredAt: { gte: today } },
          _sum: { codAmount: true }
        }),
        db.order.findMany({
          where: { deliveryManId: dm.id, status: { in: ['SHIPPED', 'DELIVERED', 'RETURNED', 'POSTPONED'] } },
          select: { city: true, status: true, codAmount: true, recipientName: true, phone: true, address: true, trackingNumber: true, id: true, createdAt: true }
        })
      ])

      // Group orders by city
      const byCity = allOrders.reduce((acc, o) => {
        if (!acc[o.city]) acc[o.city] = { assigned: 0, delivered: 0, returned: 0, postponed: 0 }
        if (o.status === 'SHIPPED') acc[o.city].assigned++
        if (o.status === 'DELIVERED') acc[o.city].delivered++
        if (o.status === 'RETURNED') acc[o.city].returned++
        if (o.status === 'POSTPONED') acc[o.city].postponed++
        return acc
      }, {} as Record<string, { assigned: number; delivered: number; returned: number; postponed: number }>)

      const totalResolved = deliveredToday + returnedToday
      const deliveryRate = totalResolved > 0
        ? Math.round((deliveredToday / totalResolved) * 100)
        : 0

      // Pending remittance (delivered all time, not yet remitted)
      const pendingRemittance = await db.order.aggregate({
        where: {
          deliveryManId: dm.id,
          status: 'DELIVERED',
          NOT: { note: { contains: '[REMITTED]' } }
        },
        _sum: { codAmount: true }
      })

      return {
        id: dm.id,
        name: dm.name,
        email: dm.email,
        phone: dm.phone,
        assigned,
        deliveredToday,
        returnedToday,
        postponedToday,
        cashCollectedToday: cashToday._sum.codAmount ?? 0,
        pendingRemittance: pendingRemittance._sum.codAmount ?? 0,
        deliveryRate,
        byCity: Object.entries(byCity).map(([city, counts]) => ({ city, ...counts }))
      }
    }))

    // Unassigned CONFIRMED orders
    const unassigned = await db.order.count({
      where: { status: 'CONFIRMED', deliveryManId: null }
    })

    // Overall today totals
    const totalDeliveredToday = stats.reduce((s, d) => s + d.deliveredToday, 0)
    const totalCashToday = stats.reduce((s, d) => s + d.cashCollectedToday, 0)
    const totalPendingRemittance = stats.reduce((s, d) => s + d.pendingRemittance, 0)
    const totalAssigned = stats.reduce((s, d) => s + d.assigned, 0)

    return NextResponse.json({
      deliveryMen: stats,
      summary: {
        totalDeliveredToday,
        totalCashToday,
        totalPendingRemittance,
        totalAssigned,
        unassignedConfirmed: unassigned
      }
    })
  } catch (error) {
    console.error('Delivery overview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/delivery-overview — bulk assign CONFIRMED orders to delivery man
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { deliveryManId, orderIds, city } = body

    if (!deliveryManId) {
      return NextResponse.json({ error: 'deliveryManId is required' }, { status: 400 })
    }

    const deliveryMan = await db.user.findUnique({
      where: { id: deliveryManId },
      select: { id: true, name: true, role: true, isActive: true }
    })

    if (!deliveryMan || deliveryMan.role !== 'DELIVERY' || !deliveryMan.isActive) {
      return NextResponse.json({ error: 'Invalid delivery man' }, { status: 400 })
    }

    let where: Record<string, unknown>

    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      // Reassign existing SHIPPED/POSTPONED orders between delivery men
      where = { id: { in: orderIds }, status: { in: ['SHIPPED', 'POSTPONED', 'CONFIRMED'] } }
    } else if (city) {
      where = { status: 'CONFIRMED', city, deliveryManId: null }
    } else {
      where = { status: 'CONFIRMED', deliveryManId: null }
    }

    const result = await db.order.updateMany({
      where,
      data: {
        deliveryManId: deliveryManId,
        status: 'SHIPPED',
        shippedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      assigned: result.count,
      to: deliveryMan.name
    })
  } catch (error) {
    console.error('Delivery assign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
