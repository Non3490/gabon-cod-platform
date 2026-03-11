import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30d'
    const sellerId = searchParams.get('sellerId')
    const city = searchParams.get('city')
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Build base where clause
    const baseWhere: any = { createdAt: { gte: dateFrom } }
    if (sellerId) {
      baseWhere.sellerId = sellerId
    }
    if (city) {
      baseWhere.city = city
    }

    const topCitiesGroup = await db.order.groupBy({
      by: ['city'],
      _count: { _all: true },
      orderBy: { _count: { city: 'desc' } },
      take: 10,
      where: baseWhere
    })

    const topCities = topCitiesGroup.map(item => ({ city: item.city, count: item._count._all }))

    // Get sellers list for admin filter
    const sellers = session.role === 'ADMIN'
      ? await db.user.findMany({
          where: { role: 'SELLER', isActive: true },
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' }
        })
      : []

    const topProductsGroup = await db.orderItem.groupBy({
      by: ['productId'],
      _count: { _all: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 10,
      where: { order: baseWhere }
    })

    const productIds = topProductsGroup.map(p => p.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true }
    })

    const topProducts = topProductsGroup.map(item => ({
      productId: item.productId,
      productName: products.find(p => p.id === item.productId)?.name ?? 'Unknown',
      count: item._count._all
    }))

    const cityList = topCities.map(c => c.city)
    const deliveryStats = await db.order.groupBy({
      by: ['city', 'status'],
      _count: { _all: true },
      where: { city: { in: cityList }, createdAt: { gte: dateFrom }, ...(sellerId && { sellerId }) }
    })

    const deliveryRateByCity = cityList.map(city => {
      const cityData = deliveryStats.filter(s => s.city === city)
      const total = cityData.reduce((acc, cur) => acc + cur._count._all, 0)
      const delivered = cityData.find(s => s.status === 'DELIVERED')?._count._all ?? 0
      return { city, deliveryRate: total > 0 ? parseFloat(((delivered / total) * 100).toFixed(1)) : 0 }
    })

    const revenueRes = await db.order.aggregate({
      _sum: { codAmount: true },
      where: { status: 'DELIVERED', deliveredAt: { gte: dateFrom }, ...(sellerId && { sellerId }) }
    })

    return NextResponse.json({
      topCities,
      topProducts,
      deliveryRateByCity,
      sellers,
      revenueByPeriod: {
        totalRevenue: revenueRes._sum.codAmount ?? 0,
        period,
        dateFrom
      }
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
