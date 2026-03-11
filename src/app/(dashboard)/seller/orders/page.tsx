'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Package, Search, RefreshCw } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  RETURNED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
}

interface Order {
  id: string
  trackingNumber: string
  recipientName: string
  phone: string
  city: string
  codAmount: number
  status: string
  createdAt: string
  items: Array<{ product: { name: string } }>
}

export default function SellerOrdersPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (userLoading) return
    if (!user) { router.push('/login'); return }
    if (user.role !== 'SELLER' && user.role !== 'ADMIN') { router.push('/unauthorized'); return }
  }, [user, userLoading, router])

  useEffect(() => {
    if (!user) return
    fetchOrders()
  }, [user, status, page])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (status !== 'ALL') params.set('status', status)
      if (search) params.set('search', search)
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()
      setOrders(data.orders ?? [])
      setTotalPages(data.pagination?.totalPages ?? 1)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('fr-GA', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(v)

  if (userLoading || !user) return null

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Orders</h1>
            <p className="text-muted-foreground">Manage and track your orders</p>
          </div>
          <Button onClick={() => router.push('/orders/new')}>
            <Package className="mr-2 h-4 w-4" /> New Order
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, tracking..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchOrders()}
            />
          </div>
          <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="SHIPPED">Shipped</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="RETURNED">Returned</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p>No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-3 px-2">Tracking</th>
                      <th className="text-left py-3 px-2">Customer</th>
                      <th className="text-left py-3 px-2 hidden md:table-cell">Product</th>
                      <th className="text-right py-3 px-2">COD</th>
                      <th className="text-center py-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr
                        key={order.id}
                        className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        <td className="py-3 px-2 font-mono">{order.trackingNumber}</td>
                        <td className="py-3 px-2">
                          <div className="font-medium">{order.recipientName}</div>
                          <div className="text-xs text-muted-foreground">{order.city}</div>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          {order.items?.[0]?.product?.name ?? '—'}
                        </td>
                        <td className="py-3 px-2 text-right font-medium">{formatCurrency(order.codAmount)}</td>
                        <td className="py-3 px-2 text-center">
                          <Badge className={STATUS_COLORS[order.status] ?? ''}>{order.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <span className="flex items-center text-sm px-3">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
