'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import { SoftphoneProvider, useSoftphone } from '@/components/call-center/SoftphoneProvider'
import { ActiveCallPanel } from '@/components/call-center/ActiveCallPanel'
import { CallButton } from '@/components/call-center/CallButton'
import { PrintLabelsButton } from '@/components/orders/PrintLabelsButton'
import {
  Phone,
  PhoneOff,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCcw,
  User,
  MapPin,
  Package,
  DollarSign,
  Calendar,
  MessageSquare,
  Loader2,
  PhoneCall,
  PhoneMissed,
  PhoneIncoming,
  AlertTriangle,
  Layers,
  ShieldAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import PusherClient from 'pusher-js'

// Initialize Pusher client for real-time updates
const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || ''
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu'

let pusher: PusherClient | null = null
if (typeof window !== 'undefined' && pusherKey) {
  pusher = new PusherClient(pusherKey, {
    cluster: pusherCluster,
    channelAuthorization: {
      endpoint: '/api/pusher/auth',
      transport: 'ajax'
    }
  })
}

interface CallLogEntry {
  id: string
  attempt: string
  createdAt: string
}

interface Order {
  id: string
  trackingNumber: string
  customerName: string
  customerPhone: string
  customerAddress: string
  city: string
  productName: string
  productDescription?: string
  quantity: number
  codAmount: number
  status: string
  notes: string | null
  createdAt: string
  scheduledCallAt: string | null
  callLogs: CallLogEntry[]
  sellerName?: string
  isBundle: boolean
  bundleGroupId: string | null
  itemNames: string[]
  itemCount: number
  isBlacklisted: boolean
}

interface CallLog {
  id: string
  orderId: string
  orderTracking: string
  customerName: string
  attempt: string
  comment: string | null
  createdAt: string
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  NEW: { label: 'New', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  POSTPONED: { label: 'Postponed', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  NO_ANSWER: { label: 'No Answer', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  BUSY: { label: 'Busy', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  CALLBACK: { label: 'Callback', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  UNREACHED: { label: 'Unreachable', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  WRONG_NUMBER: { label: 'Wrong Number', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  DOUBLE: { label: 'Duplicate', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  RETURN_TO_STOCK: { label: 'Return to Stock', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
}

export default function CallCenterPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { callStatus } = useSoftphone()

  const [orders, setOrders] = useState<Order[]>([])
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [callNotes, setCallNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ totalCalls: 0, confirmed: 0, cancelled: 0 })
  // Manual callback scheduling
  const [callScheduleDate, setCallScheduleDate] = useState('')
  const [callScheduleTime, setCallScheduleTime] = useState('')
  // Bundle confirm dialog
  const [showBundleConfirmDialog, setShowBundleConfirmDialog] = useState(false)
  const [bundleConfirming, setBundleConfirming] = useState(false)
  const [currentBundleId, setCurrentBundleId] = useState<string | null>(null)

  // Expense logging
  const [expenseCategory, setExpenseCategory] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [submittingExpense, setSubmittingExpense] = useState(false)

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
    }
  }, [user, userLoading, router])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [ordersRes, logsRes] = await Promise.all([
        fetch('/api/orders/queue'),
        fetch('/api/call-logs')
      ])
      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data.orders || [])
        const logsData = await logsRes.json()
        setCallLogs(logsData.logs || [])
        setStats(data.stats || { totalCalls: 0, confirmed: 0, cancelled: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) fetchData()
  }, [fetchData])

  // Subscribe to Pusher real-time updates
  useEffect(() => {
    if (!pusher || !user) return

    const channel = pusher.subscribe('queue-updates')

    // Handle order updates
    channel.bind('order-updated', (data: any) => {
      // Refresh queue when order status changes
      console.log('[Pusher] Order updated:', data)
      fetchData()
    })

    // Handle new orders
    channel.bind('order-created', (data: any) => {
      console.log('[Pusher] Order created:', data)
      fetchData()
    })

    // Handle bundle detection
    channel.bind('bundle-detected', (data: any) => {
      console.log('[Pusher] Bundle detected:', data)
      toast.info(`Bundle detected: ${data.orderCount} orders from ${data.customerName}`)
      fetchData()
    })

    // Cleanup on unmount
    return () => {
      channel.unbind_all()
      pusher.unsubscribe('queue-updates')
    }
  }, [user, fetchData])

  const logCall = async (orderId: string, attempt: string) => {
    const res = await fetch('/api/call-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, attempt, comment: callNotes })
    })
    if (res.ok) {
      toast.success('Call logged')
      setCallNotes('')
      await fetchData() // Refresh to get the updated log
    } else {
      toast.error('Failed to log call')
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: callNotes })
      })
      if (!res.ok) throw new Error('Failed to update order')
      toast.success(`Order ${newStatus.toLowerCase().replace('_', ' ')}`)
      setSelectedOrder(null)
      setCallNotes('')
      await fetchData()
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Failed to update order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleScheduleCallback = async () => {
    if (!selectedOrder || !callScheduleDate || !callScheduleTime) return
    setSubmitting(true)
    try {
      // Combine date and time into proper DateTime
      const scheduledAt = new Date(`${callScheduleDate}T${callScheduleTime}`)

      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledCallAt: scheduledAt.toISOString() })
      })

      if (!res.ok) {
        throw new Error('Failed to schedule callback')
      }

      toast.success('Callback scheduled successfully')
      setSelectedOrder(null)
      setCallScheduleDate('')
      setCallScheduleTime('')
      await fetchData()
    } catch (error) {
      console.error('Failed to schedule callback:', error)
      toast.error('Failed to schedule callback')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmBundle = async () => {
    if (!currentBundleId) return
    setBundleConfirming(true)
    try {
      const res = await fetch('/api/orders/bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId: currentBundleId })
      })

      if (!res.ok) {
        throw new Error('Failed to confirm bundle')
      }

      const data = await res.json()
      toast.success(data.message || 'Bundle confirmed successfully')
      setShowBundleConfirmDialog(false)
      setCurrentBundleId(null)
      setSelectedOrder(null)
      await fetchData()
    } catch (error) {
      console.error('Bundle confirm error:', error)
      toast.error('Failed to confirm bundle')
    } finally {
      setBundleConfirming(false)
    }
  }

  const handleLogExpense = async () => {
    if (!expenseCategory || !expenseAmount) return
    setSubmittingExpense(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: expenseCategory,
          amount: expenseAmount,
          description: expenseDescription
        })
      })

      if (!res.ok) throw new Error('Failed to log expense')

      toast.success('Expense logged successfully')
      setExpenseCategory('')
      setExpenseAmount('')
      setExpenseDescription('')
    } catch (error) {
      console.error('Expense logging error:', error)
      toast.error('Failed to log expense')
    } finally {
      setSubmittingExpense(false)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-GA', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(value)

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const openPhone = (phone: string) => window.open(`tel:${phone}`, '_self')

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'CALL_CENTER')) return null

  return (
    <SoftphoneProvider>
      <DashboardLayout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <PhoneCall className="h-6 w-6" />Call Center
              </h1>
              <p className="text-muted-foreground text-sm">Confirm orders and manage customer calls</p>
            </div>
            <div className="flex gap-2">
              {user.role === 'CALL_CENTER' && (
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCcw className="h-4 w-4" />Refresh
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{orders.length}</p>
                  </div>
                  <Phone className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Confirmed Today</p>
                    <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cancelled Today</p>
                    <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                    <p className="text-2xl font-bold">{stats.totalCalls}</p>
                  </div>
                  <PhoneCall className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Call Panel */}
          {callStatus !== 'idle' && selectedOrder && (
            <ActiveCallPanel
              customerName={selectedOrder.customerName}
              phone={selectedOrder.customerPhone}
              orderCode={selectedOrder.trackingNumber}
            />
          )}

          {/* Orders Queue */}
          <Card>
            <CardHeader>
              <CardTitle>Call Queue ({orders.length})</CardTitle>
              <CardDescription>Orders pending confirmation</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No orders in queue</p>
                  <p className="text-sm mt-2">Orders will appear here automatically when imported</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className={cn(
                        'p-4 rounded-lg border cursor-pointer transition-colors',
                        selectedOrder?.id === order.id && 'ring-2 ring-primary bg-primary/5'
                      )}
                      onClick={() => {
                        setSelectedOrder(order)
                        setCallNotes(order.notes || '')
                      }}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              {order.trackingNumber}
                            </span>
                            {order.isBlacklisted && (
                              <Badge variant="destructive" className="ml-2">
                                <ShieldAlert className="h-3 w-3" />Blacklisted
                              </Badge>
                            )}
                            {callLogs.length > 0 && (
                              <Badge variant="outline" className="ml-2">
                                <Layers className="h-3 w-3" />{callLogs.length}
                              </Badge>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{order.customerName}</p>
                            {order.sellerName && (
                              <p className="text-sm text-muted-foreground">Seller: {order.sellerName}</p>
                            )}
                            <p className="text-sm">{order.customerPhone}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPhone(order.customerPhone)}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <CallButton
                            orderId={order.id}
                            phone={order.customerPhone}
                          />
                        </div>
                      </div>

                      <div className="text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground inline" />
                        <span className="ml-1">{order.customerAddress}</span>
                        <span>, {order.city}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={statusConfig[order.status]?.color}>
                          {statusConfig[order.status]?.label}
                        </Badge>
                        {order.scheduledCallAt && (
                          <span className="text-xs text-muted-foreground ml-2">
                            📅 {formatDate(order.scheduledCallAt)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold">{formatCurrency(order.codAmount)}</span>
                      </div>

                      {order.itemCount > 1 && (
                        <div className="flex items-center gap-1">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{order.itemCount} items</span>
                        </div>
                      )}

                      <div>
                        <p className="font-medium truncate">{order.productName}</p>
                        {order.productDescription && (
                          <p className="text-sm text-muted-foreground truncate">{order.productDescription}</p>
                        )}
                      </div>
                    </div>
                    {selectedOrder?.id === order.id && (
                      <>
                        {/* Order Details Panel */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="space-y-4">
                          {/* Customer Info */}
                          <div className="grid gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Customer</p>
                              <p className="font-medium">{selectedOrder.customerName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Phone</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPhone(selectedOrder.customerPhone)}
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                              <p className="text-muted-foreground">Address</p>
                              <p className="font-medium">{selectedOrder.customerAddress}</p>
                              <p>, {selectedOrder.city}</p>
                            </div>
                          </div>

                          {/* Call Actions */}
                          <div className="space-y-3 pt-4 border-t">
                            <div>
                              <p className="text-sm font-medium">Call Actions</p>
                              <div className="grid grid-cols-2 gap-3">
                                <Button
                                  onClick={() => {
                                    // Check if this is a bundle order
                                    if (selectedOrder.bundleGroupId) {
                                      setCurrentBundleId(selectedOrder.bundleGroupId)
                                      setShowBundleConfirmDialog(true)
                                    } else {
                                      logCall(selectedOrder.id, 'ANSWERED', 'Confirmed')
                                      updateOrderStatus(selectedOrder.id, 'CONFIRMED')
                                    }
                                  }}
                                  disabled={submitting || callStatus !== 'idle'}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />Confirm{selectedOrder.bundleGroupId ? ' All' : ''}
                                </Button>
                                <Button
                                  onClick={() => {
                                    logCall(selectedOrder.id, 'NO_ANSWER', 'No Answer')
                                    updateOrderStatus(selectedOrder.id, 'NO_ANSWER')
                                    }}
                                  disabled={submitting || callStatus !== 'idle'}
                                  className="bg-gray-500 hover:bg-gray-600 text-white"
                                >
                                  <PhoneMissed className="h-4 w-4 mr-1" />No Answer
                                </Button>
                                <Button
                                  onClick={() => {
                                    logCall(selectedOrder.id, 'BUSY', 'Busy')
                                    updateOrderStatus(selectedOrder.id, 'NO_ANSWER')
                                    }}
                                  disabled={submitting || callStatus !== 'idle'}
                                  className="bg-orange-500 hover:bg-orange-600 text-white"
                                >
                                  <PhoneOff className="h-4 w-4 mr-1" />Busy
                                </Button>
                              </div>
                              <Button
                                onClick={() => {
                                    logCall(selectedOrder.id, 'CALLBACK', 'Callback')
                                    updateOrderStatus(selectedOrder.id, 'POSTPONED')
                                    }}
                                    disabled={submitting || callStatus !== 'idle'}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                >
                                  <PhoneIncoming className="h-4 w-4 mr-1" />Callback
                                </Button>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Schedule Callback</p>
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  type="date"
                                  placeholder="Select date"
                                  value={callScheduleDate}
                                  onChange={(e) => setCallScheduleDate(e.target.value)}
                                  className="h-9 w-full"
                                />
                                <Input
                                  type="time"
                                  placeholder="Select time"
                                  value={callScheduleTime}
                                  onChange={(e) => setCallScheduleTime(e.target.value)}
                                  className="h-9 w-full"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={!callScheduleDate || !callScheduleTime || submitting}
                                  onClick={() => {
                                    handleScheduleCallback()
                                  }}
                                >
                                  Schedule & Close
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Notes Input */}
                          <div>
                            <p className="text-sm font-medium">Call Notes</p>
                            <Textarea
                              placeholder="Add notes about this call..."
                              value={callNotes}
                              onChange={(e) => setCallNotes(e.target.value)}
                              rows={2}
                              className="min-h-[80px]"
                            />
                          </div>

                          {/* Cancel Double */}
                          <div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                updateOrderStatus(selectedOrder.id, 'CANCELLED')
                                setSelectedOrder(null)
                              }}
                              disabled={submitting}
                              className="w-full"
                            >
                              Cancel Order
                            </Button>
                          </div>
                        </div>
                      </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Call Center Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />Log Expense
            </CardTitle>
            <CardDescription>Record work-related expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Internet">Internet</SelectItem>
                    <SelectItem value="Call Minutes">Call Minutes</SelectItem>
                    <SelectItem value="Transportation">Transportation</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (XAF)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Input
                  placeholder="Describe the expense..."
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                />
              </div>
              <div className="md:col-span-4">
                <Button
                  onClick={handleLogExpense}
                  disabled={!expenseCategory || !expenseAmount || submittingExpense}
                  className="w-full"
                >
                  {submittingExpense ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
                  Log Expense
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bundle Confirm Dialog */}
        <Dialog open={showBundleConfirmDialog} onOpenChange={setShowBundleConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm All Bundle Orders?</DialogTitle>
              <DialogDescription>
                This customer has multiple orders from different sellers today.
                Do you want to confirm all orders in this bundle at once?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowBundleConfirmDialog(false)}
                disabled={bundleConfirming}
              >
                Confirm This Only
              </Button>
              <Button
                onClick={handleConfirmBundle}
                disabled={bundleConfirming}
                className="bg-green-600 hover:bg-green-700"
              >
                {bundleConfirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
    )
  </>
}
