import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/stock - fetch stock data with low stock alerts
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const search = request.nextUrl.searchParams.get('search')

    // Role-based scoping
    const where = user.role !== 'ADMIN' ? { sellerId: user.id } : {}

    const products = await db.product.findMany({
      where,
      include: { stocks: true },
      orderBy: { name: 'asc' }
    })

    // Filter products with search
    const filteredProducts = search
      ? products.filter(p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase())
        )
      : products

    // Calculate low stock products (any stock at or below alert level, or completely out of stock)
    const lowStockProducts = filteredProducts.filter(p => {
      if (p.stocks.length === 0) return false
      return p.stocks.some(s => s.quantity > 0 && s.quantity <= s.alertLevel) ||
             p.stocks.every(s => s.quantity === 0)
    })

    // Calculate totals
    const totalProducts = filteredProducts.length
    const totalStock = filteredProducts.flatMap(p => p.stocks).reduce((sum, s) => sum + s.quantity, 0)
    const outOfStock = filteredProducts.filter(p =>
      p.stocks.every(s => s.quantity === 0)
    ).length

    return NextResponse.json({
      products: filteredProducts.map(p => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        isActive: p.isActive,
        totalStock: p.stocks.reduce((sum, s) => sum + s.quantity, 0),
        stocks: p.stocks.map(s => ({
          id: s.id,
          warehouse: s.warehouse,
          quantity: s.quantity,
          alertLevel: s.alertLevel,
          isLow: s.quantity > 0 && s.quantity <= s.alertLevel,
          isOut: s.quantity === 0,
        }))
      })),
      lowStock: lowStockProducts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        totalStock: p.stocks.reduce((sum, s) => sum + s.quantity, 0),
        stocks: p.stocks.map(s => ({
          warehouse: s.warehouse,
          quantity: s.quantity,
          alertLevel: s.alertLevel,
          isLow: s.quantity > 0 && s.quantity <= s.alertLevel,
          isOut: s.quantity === 0,
        }))
      })),
      stats: {
        totalProducts,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStock,
        totalStock,
      }
    })
  } catch (error) {
    console.error('Stock GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
