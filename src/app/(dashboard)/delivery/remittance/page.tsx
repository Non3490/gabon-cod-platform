'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import {
  Lock,
  Unlock,
  Wallet,
  Package,
  CheckCircle,
  RefreshCcw,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface DeliveryMan {
  id: string
  name: string
}

interface RemittanceRow {
  deliveryMan: DeliveryMan
  ordersToday: number
  deliveredCount: number
  totalCashCollected: number
  isLocked: boolean
  invoiceId: string | null
  invoiceRef: string | null
  lockedAt: string | null
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GA', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(value)

export default function RemittancePage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [data, setData] = useState<RemittanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [lockingId, setLockingId] = useState<string | null>(null)

  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/unauthorized')
    }
  }, [user, userLoading, router])

  const fetchRemittance = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch('/api/delivery/remittance')
      if (res.ok) {
        const json = await res.json()
        setData(json.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch remittance data:', error)
      toast.error('Failed to load remittance data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchRemittance()
  }, [user])

  const handleLock = async (deliveryManId: string, deliveryManName: string) => {
    setLockingId(deliveryManId)
    try {
      const res = await fetch('/api/delivery/remittance/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryManId })
      })

      if (!res.ok) {
        const error = await res.json()
        if (error.error === 'Remittance already locked for today') {
          toast.error('Remittance already locked for today')
          fetchRemittance()
          return
        }
        throw new Error(error.error || 'Failed to lock remittance')
      }

      const result = await res.json()
      toast.success(`Remittance locked: ${result.ordersCount} orders, ${formatCurrency(result.totalCash)}`)
      fetchRemittance()
    } catch (error) {
      console.error('Lock error:', error)
      toast.error('Failed to lock remittance')
    } finally {
      setLockingId(null)
    }
  }

  const totalCashCollected = data.reduce((sum, row) => sum + row.totalCashCollected, 0)
  const totalDelivered = data.reduce((sum, row) => sum + row.deliveredCount, 0)
  const totalLocked = data.filter(row => row.isLocked).length

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') return null

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Wallet className="h-6 w-6" />Delivery Remittance
            </h1>
            <p className="text-muted-foreground text-sm">
              Lock and reconcile delivery cycles
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRemittance}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Cash</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalCashCollected)}</p>
                </div>
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                  <p className="text-2xl font-bold">{totalDelivered}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Men</p>
                  <p className="text-2xl font-bold">{data.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Locked</p>
                  <p className="text-2xl font-bold">{totalLocked}</p>
                </div>
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Remittance Table */}
        <Card>
          <CardContent className="p-6">
            {data.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No delivery men found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Delivery Man</th>
                      <th className="text-center p-4 font-medium">Orders Today</th>
                      <th className="text-center p-4 font-medium">Delivered</th>
                      <th className="text-right p-4 font-medium">Cash Collected</th>
                      <th className="text-center p-4 font-medium">Status</th>
                      <th className="text-center p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr
                        key={row.deliveryMan.id}
                        className={cn(
                          'border-b hover:bg-muted/50 transition-colors',
                          row.isLocked && 'bg-muted/30'
                        )}
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{row.deliveryMan.name}</p>
                            {row.isLocked && row.invoiceRef && (
                              <p className="text-sm text-muted-foreground">{row.invoiceRef}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">{row.ordersToday}</td>
                        <td className="p-4 text-center">{row.deliveredCount}</td>
                        <td className="p-4 text-right font-medium">
                          {formatCurrency(row.totalCashCollected)}
                        </td>
                        <td className="p-4 text-center">
                          {row.isLocked ? (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" /> Locked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Unlock className="h-3 w-3" /> Open
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {!row.isLocked && row.deliveredCount > 0 && (
                            <Button
                              onClick={() => handleLock(row.deliveryMan.id, row.deliveryMan.name)}
                              size="sm"
                              disabled={lockingId === row.deliveryMan.id}
                            >
                              {lockingId === row.deliveryMan.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Lock className="h-4 w-4 mr-1" />
                                  Lock
                                </>
                              )}
                            </Button>
                          )}
                          {row.isLocked && row.lockedAt && (
                            <span className="text-sm text-muted-foreground">
                              {new Date(row.lockedAt).toLocaleTimeString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
