'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import {
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  RefreshCcw,
  User,
  Loader2,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GA', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(value)

interface DeliveryMan {
  id: string
  name: string
  createdAt: string
}

interface DeliveryStats {
  deliveryMan: DeliveryMan
  stats: {
    totalOrders: number
    delivered: number
    returned: number
    cancelled: number
    postponed: number
    inProgress: number
    totalCashCollected: number
    deliveryRate: string
    avgDeliveriesPerDay: string
    avgCodPerDelivery: string
    completionRate: string
  }
}

interface PerformanceSummary {
  totalDeliveryMen: number
  totalOrders: number
  totalDelivered: number
  totalReturned: number
  totalCashCollected: number
  avgDeliveryRate: string
}

export default function DeliveryPerformancePage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [data, setData] = useState<DeliveryStats[]>([])
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7')

  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/unauthorized')
    }
  }, [user, userLoading, router])

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch(`/api/delivery/performance?period=${period}`)
      if (res.ok) {
        const json = await res.json()
        setData(json.data || [])
        setSummary(json.summary)
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
      toast.error('Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchData()
  }, [user, period])

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
              <BarChart3 className="h-6 w-6" />Delivery Performance
            </h1>
            <p className="text-muted-foreground text-sm">Delivery man metrics and efficiency</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Men</p>
                    <p className="text-2xl font-bold">{summary.totalDeliveryMen}</p>
                  </div>
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{summary.totalOrders}</p>
                  </div>
                  <Truck className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                    <p className="text-2xl font-bold text-green-600">{summary.totalDelivered}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Returned</p>
                    <p className="text-2xl font-bold text-red-600">{summary.totalReturned}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cash Collected</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalCashCollected)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Rate</p>
                    <p className="text-2xl font-bold">{summary.avgDeliveryRate}%</p>
                  </div>
                  <Clock className="h-8 w-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Table */}
        <Card>
          <CardContent className="p-6">
            {data.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>No performance data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Delivery Man</th>
                      <th className="text-center p-4 font-medium">Orders</th>
                      <th className="text-center p-4 font-medium">Delivered</th>
                      <th className="text-center p-4 font-medium">Returned</th>
                      <th className="text-center p-4 font-medium">Cash</th>
                      <th className="text-center p-4 font-medium">Del. Rate</th>
                      <th className="text-center p-4 font-medium">Avg/Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.deliveryMan.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <p className="font-medium">{row.deliveryMan.name}</p>
                        </td>
                        <td className="p-4 text-center font-medium">{row.stats.totalOrders}</td>
                        <td className="p-4 text-center text-green-600 font-medium">{row.stats.delivered}</td>
                        <td className="p-4 text-center text-red-600 font-medium">{row.stats.returned}</td>
                        <td className="p-4 text-right font-medium text-green-700">
                          {formatCurrency(row.stats.totalCashCollected)}
                        </td>
                        <td className="p-4 text-center">
                          <Badge className={cn(
                            'px-2 py-1',
                            parseFloat(row.stats.deliveryRate) >= 80 ? 'bg-green-100 text-green-800' :
                            parseFloat(row.stats.deliveryRate) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          )}>
                            {row.stats.deliveryRate}%
                          </Badge>
                        </td>
                        <td className="p-4 text-center">{row.stats.avgDeliveriesPerDay}</td>
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
