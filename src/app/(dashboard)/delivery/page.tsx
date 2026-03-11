'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import {
  Truck,
  MapPin,
  Phone,
  Package,
  DollarSign,
  CheckCircle,
  XCircle,
  RefreshCcw,
  Navigation,
  Wallet,
  User,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface OrderItem {
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
}

interface Order {
  id: string
  trackingNumber: string
  recipientName: string
  phone: string
  address: string
  city: string
  codAmount: number
  status: string
  note: string | null
  podPhotoUrl: string | null
  podSignatureUrl: string | null
  createdAt: string
  items: OrderItem[]
  seller?: { id: string; name: string }
}

interface DeliveryStats {
  assigned: number
  delivered: number
  returned: number
  cashCollected: number
}

const statusConfig: Record<string, { label: string; color: string }> = {
  SHIPPED: { label: 'Out for Delivery', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  RETURNED: { label: 'Returned', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  POSTPONED: { label: 'Postponed', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  RETURN_TO_STOCK: { label: 'Return to Stock', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
}

export default function DeliveryPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [stats, setStats] = useState<DeliveryStats>({
    assigned: 0, delivered: 0, returned: 0, cashCollected: 0
  })

  useEffect(() => {
    if (!userLoading && !user) router.push('/login')
  }, [user, userLoading, router])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch('/api/delivery')
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders ?? [])
        setStats(data.stats ?? { assigned: 0, delivered: 0, returned: 0, cashCollected: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch delivery data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) fetchData()
  }, [fetchData, user])

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedOrder) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: deliveryNotes })
      })
      if (!res.ok) throw new Error('Failed to update order')
      toast.success(`Order marked as ${statusConfig[newStatus]?.label || newStatus}`)
      setSelectedOrder(null)
      setDeliveryNotes('')
      fetchData()
    } catch (error) {
      console.error('Status update error:', error)
      toast.error('Failed to update status')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-GA', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(value)

  const openPhone = (phone: string) => window.open(`tel:${phone}`, '_self')

  const openNavigation = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}`)
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.open(`maps://maps.apple.com/?q=${query}`, '_blank')
    } else {
      window.open(`https://maps.google.com/maps?daddr=${query}`, '_blank')
    }
  }

  const openWaze = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}`)
    window.open(`https://waze.com/ul?navigate=yes&q=${query}`, '_blank')
  }

  const getProductDisplay = (order: Order) => {
    if (!order.items || order.items.length === 0) return 'Unknown product'
    const first = order.items[0]
    const extra = order.items.length > 1 ? ` +${order.items.length - 1} more` : ''
    return `${first.productName} x${first.quantity}${extra}`
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="h-6 w-6" />Delivery
            </h1>
            <p className="text-muted-foreground text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            {user.role === 'ADMIN' && (
              <Button variant="outline" size="sm" onClick={() => router.push('/delivery/remit')}>
                <Wallet className="h-4 w-4 mr-1" />Remit
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Cash on Hand Card */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Cash on Hand Today</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.cashCollected)}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Wallet className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{stats.assigned}</p>
                <p className="text-xs text-green-100">To Deliver</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.delivered}</p>
                <p className="text-xs text-green-100">Delivered</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.returned}</p>
                <p className="text-xs text-green-100">Returned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-3">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No orders assigned for delivery</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card
                key={order.id}
                className={cn(
                  'cursor-pointer transition-all',
                  selectedOrder?.id === order.id && 'ring-2 ring-primary'
                )}
                onClick={() => {
                  setSelectedOrder(selectedOrder?.id === order.id ? null : order)
                  setDeliveryNotes(order.note || '')
                }}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-mono text-sm text-muted-foreground">{order.trackingNumber}</span>
                      <p className="font-medium">{order.recipientName}</p>
                      {user.role === 'ADMIN' && order.seller && (
                        <p className="text-xs text-muted-foreground">Seller: {order.seller.name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge className={statusConfig[order.status]?.color}>
                        {statusConfig[order.status]?.label}
                      </Badge>
                      <p className="font-bold text-green-600 mt-1">
                        {formatCurrency(order.codAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{order.address}, {order.city}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4 flex-shrink-0" />
                    <span>{getProductDisplay(order)}</span>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); openPhone(order.phone) }}
                    >
                      <Phone className="h-4 w-4 mr-1" />Call
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); openNavigation(order.address, order.city) }}
                    >
                      <Navigation className="h-4 w-4 mr-1" />Maps
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      style={{ backgroundColor: '#33ccff', color: 'white', borderColor: '#33ccff' }}
                      onClick={(e) => { e.stopPropagation(); openWaze(order.address, order.city) }}
                    >
                      <Navigation className="h-4 w-4 mr-1" />Waze
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedOrder(selectedOrder?.id === order.id ? null : order)
                      }}
                    >
                      <ChevronRight className={cn(
                        'h-4 w-4 transition-transform',
                        selectedOrder?.id === order.id && 'rotate-90'
                      )} />
                    </Button>
                  </div>

                  {/* Expanded Details */}
                  {selectedOrder?.id === order.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{order.recipientName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{order.phone}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span>{order.address}, {order.city}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-bold">{formatCurrency(order.codAmount)}</span>
                        </div>
                        {(order.items ?? []).map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{item.productName} x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Delivery Notes</p>
                        <Textarea
                          placeholder="Add delivery notes..."
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          rows={2}
                        />
                      </div>

                      {(order.status === 'SHIPPED' || order.status === 'POSTPONED') && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              className="bg-green-600 hover:bg-green-700 h-12"
                              onClick={() => handleStatusUpdate('DELIVERED')}
                              disabled={submitting}
                            >
                              {submitting
                                ? <Loader2 className="h-5 w-5 animate-spin" />
                                : <><CheckCircle className="mr-2 h-5 w-5" />Delivered</>
                              }
                            </Button>
                            <Button
                              variant="destructive"
                              className="h-12"
                              onClick={() => handleStatusUpdate('RETURNED')}
                              disabled={submitting}
                            >
                              <XCircle className="mr-2 h-5 w-5" />Returned
                            </Button>
                          </div>
                          {order.status === 'SHIPPED' && (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => handleStatusUpdate('POSTPONED')}
                              disabled={submitting}
                            >
                              Postpone Delivery
                            </Button>
                          )}
                        </div>
                      )}
                      {order.status === 'RETURNED' && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleStatusUpdate('RETURN_TO_STOCK')}
                          disabled={submitting}
                        >
                          Return to Stock
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
