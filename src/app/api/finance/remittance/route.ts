import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'

// GET /api/finance/remittance - Get remittance summary for all delivery men
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Get all delivery men
    const deliveryMen = await db.user.findMany({
      where: { role: 'DELIVERY_MAN', isActive: true },
      select: { id: true, name: true, phone: true }
    })

    // Get today's date range
    const startOfDay = new Date(date + 'T00:00:00Z')
    const endOfDay = new Date(date + 'T23:59:59Z')

    // Build summaries
    const summaries = await Promise.all(
      deliveryMen.map(async (dm) => {
        // Count orders delivered today
        const deliveredOrders = await db.order.count({
          where: {
            deliveryManId: dm.id,
            status: 'DELIVERED',
            deliveredAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        })

        // Calculate cash from invoices for today
        const invoices = await db.invoice.findMany({
          where: {
            deliveryManId: dm.id,
            dateFrom: { gte: startOfDay },
            dateTo: { lte: endOfDay }
          },
          select: { cashCollected: true, status: true, isLocked: true }
        })

        const cashCollected = invoices.reduce((sum, inv) => sum + (inv.status === 'PAID' ? inv.cashCollected : 0), 0)
        const cashOnHand = invoices.reduce((sum, inv) => sum + (inv.status === 'PAID' ? 0 : inv.cashCollected), 0)
        const isLocked = invoices.length > 0 && invoices.every(inv => inv.isLocked)

        return {
          deliveryManId: dm.id,
          deliveryManName: dm.name,
          totalOrdersToday: deliveredOrders,
          totalCashCollected: cashCollected,
          cashOnHand,
          isLocked
        }
      })
    )

    return NextResponse.json({ summaries })
  } catch (error) {
    console.error('Get remittance summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/finance/remittance/lock - Lock remittance period for delivery man
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { deliveryManId, dateFrom, dateTo, cashCollected } = body

    if (!deliveryManId || !dateFrom || !dateTo || cashCollected === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get delivery man info
    const deliveryMan = await db.user.findUnique({
      where: { id: deliveryManId },
      select: { name: true }
    })

    if (!deliveryMan) {
      return NextResponse.json({ error: 'Delivery man not found' }, { status: 404 })
    }

    // Create invoice for this remittance
    const invoice = await db.invoice.create({
      data: {
        sellerId: user.id, // Admin acts as seller for remittance
        deliveryManId,
        ref: `REM-${dateFrom.split('T')[0]}-${deliveryManId.substring(0, 6)}`,
        cashCollected,
        subtotal: cashCollected,
        vat: 0,
        totalNet: cashCollected,
        status: 'PAID',
        cycleType: 'DELIVERY',
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        isLocked: true,
        lockedAt: new Date()
      }
    })

    await logActivity(user.id, user.role, 'REMITTANCE_LOCKED', `Locked remittance for ${deliveryMan.name}: ${cashCollected} XAF`)

    return NextResponse.json({ invoice, message: 'Remittance locked successfully' })
  } catch (error) {
    console.error('Lock remittance error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to lock remittance' }, { status: 500 })
  }
}
