'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import {
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Warehouse,
  Activity,
  Zap,
  ArrowRight
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Legend
} from 'recharts'
import { cn } from '@/lib/utils'

interface DashboardData {
  stats: {
    totalOrders: number
    totalRevenue: number
    totalProfit?: number
    deliveryRate: number
    pendingOrders: number
    newOrders: number
    confirmedOrders: number
    shippedOrders: number
    deliveredOrders: number
    returnedOrders: number
    cancelledOrders: number
  }
  ordersPerDay: Array<{
    date: string
    total: number
    delivered: number
  }>
  cityStats: Record<string, { total: number; delivered: number }>
  recentOrders: Array<{
    id: string
    trackingNumber: string
    customerName: string
    customerPhone: string
    city: string
    productName: string
    codAmount: number
    status: string
    createdAt: string
  }>
  usersCount: number
  activeUsersCount: number
  productsCount: number
  lowStockProducts: Array<{
    id: string
    sku: string
    name: string
    stock: number
    lowStockAlert: number
  }>
}

interface PreviousPeriodData {
  stats: {
    totalOrders: number
    totalRevenue: number
    totalProfit?: number
    deliveryRate: number
    pendingOrders: number
    newOrders: number
    confirmedOrders: number
    shippedOrders: number
    deliveredOrders: number
    returnedOrders: number
    cancelledOrders: number
  }
  ordersPerDay: Array<{
    date: string
    total: number
    delivered: number
  }>
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  NEW: { label: 'New', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200/50', icon: <Clock className="h-3.5 w-3.5" /> },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200/50', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  SHIPPED: { label: 'Shipped', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200/50', icon: <Truck className="h-3.5 w-3.5" /> },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200/50', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  RETURNED: { label: 'Returned', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200/50', icon: <XCircle className="h-3.5 w-3.5" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200/50', icon: <XCircle className="h-3.5 w-3.5" /> }
}

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

type Period = 'today' | '7d' | '30d' | 'custom'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('30d')
  const [compareWithPreviousPeriod, setCompareWithPreviousPeriod] = useState(false)
  const [previousData, setPreviousData] = useState<PreviousPeriodData | null>(null)

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
    }
  }, [user, userLoading, router])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user, period, compareWithPreviousPeriod])

  const fetchDashboardData = async () => {
    try {
      const requests = [fetch(new URL(`/api/dashboard?period=${period}`, window.location.origin).toString())]

      if (compareWithPreviousPeriod) {
        const { previousStart, previousEnd } = getPreviousPeriodDates()
        requests.push(fetch(new URL(`/api/dashboard?period=custom&dateFrom=${previousStart}&dateTo=${previousEnd}`, window.location.origin).toString()))
      }

      const responses = await Promise.all(requests)

      if (responses[0].ok) {
        setData(await responses[0].json())
      }

      if (compareWithPreviousPeriod && responses[1]?.ok) {
        setPreviousData(await responses[1].json())
      } else {
        setPreviousData(null)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPreviousPeriodDates = () => {
    const periodDays = period === 'today' ? 1 : period === '7d' ? 7 : 30
    const now = new Date()
    const periodStart = new Date(now)
    periodStart.setDate(now.getDate() - periodDays)
    const prevStart = new Date(periodStart)
    prevStart.setDate(prevStart.getDate() - periodDays)
    const prevEnd = new Date(periodStart)

    return {
      previousStart: prevStart.toISOString().split('T')[0],
      previousEnd: prevEnd.toISOString().split('T')[0]
    }
  }

  const calculatePercentChange = (current: number, previous: number): { value: number; label: string } => {
    if (!previous || previous === 0) {
      return { value: 0, label: 'N/A' }
    }
    const change = ((current - previous) / previous) * 100
    return {
      value: change,
      label: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-indigo-100 dark:border-indigo-900"></div>
          <div className="absolute top-0 h-12 w-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!user || !data) return null

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GA', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(value)
  }

  const periodLabels: Record<Period, string> = {
    today: 'Today',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    custom: 'Custom'
  }

  const cityChartData = Object.entries(data.cityStats)
    .map(([city, stats]) => ({
      city,
      total: stats.total,
      delivered: stats.delivered
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  const statusChartData = [
    { name: 'New', value: data.stats.newOrders, color: '#f59e0b' },
    { name: 'Confirmed', value: data.stats.confirmedOrders, color: '#3b82f6' },
    { name: 'Shipped', value: data.stats.shippedOrders, color: '#6366f1' },
    { name: 'Delivered', value: data.stats.deliveredOrders, color: '#10b981' },
    { name: 'Returned', value: data.stats.returnedOrders, color: '#ef4444' },
    { name: 'Cancelled', value: data.stats.cancelledOrders, color: '#64748b' }
  ].filter(d => d.value > 0)

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8 pb-10">
        {/* Modern Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-indigo-600 px-8 py-10 text-white shadow-2xl dark:bg-indigo-950">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-medium text-indigo-100 backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5 fill-current" />
                <span>System Live & Running</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Dashboard</h1>
              <p className="text-lg text-indigo-100/80">
                Welcome back, <span className="font-semibold text-white">{user.name}</span>! Here&apos;s your platform at a glance.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => router.push('/orders')}
                variant="secondary"
                className="h-11 bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg transition-all hover:scale-105"
              >
                <Package className="mr-2 h-4 w-4" />
                Manage Orders
              </Button>
              <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
                <SelectTrigger className="h-11 w-[160px] bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-full shadow-lg">
                <Switch
                  id="compare-period"
                  checked={compareWithPreviousPeriod}
                  onCheckedChange={setCompareWithPreviousPeriod}
                />
                <Label htmlFor="compare-period" className="text-sm font-semibold text-indigo-700 cursor-pointer">
                  Compare
                </Label>
              </div>
            </div>
          </div>
          {/* Abstract Decorations */}
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl transition-transform duration-1000 group-hover:scale-110" />
          <div className="absolute -bottom-20 left-40 h-60 w-60 rounded-full bg-indigo-400/20 blur-3xl" />
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {data.stats.totalProfit !== undefined && (
            <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
              <div className={cn(
                "absolute top-0 left-0 h-1 w-full",
                data.stats.totalProfit >= 0 ? "bg-indigo-500" : "bg-rose-500"
              )} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Profit</CardTitle>
                <div className={cn(
                  "rounded-2xl p-2.5 transition-transform group-hover:rotate-12",
                  data.stats.totalProfit >= 0
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30"
                    : "bg-rose-50 text-rose-600 dark:bg-rose-900/30"
                )}>
                  <Activity className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-bold tracking-tight",
                  data.stats.totalProfit >= 0 ? "text-slate-900 dark:text-white" : "text-rose-600"
                )}>
                  {formatCurrency(data.stats.totalProfit)}
                </div>
                <div className="mt-2 flex items-center text-xs font-medium text-slate-400">
                  {compareWithPreviousPeriod && previousData?.stats?.totalProfit !== undefined ? (
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-medium",
                          calculatePercentChange(data.stats.totalProfit, previousData.stats.totalProfit).value >= 0
                            ? "border-green-500 text-green-600 dark:text-green-400"
                            : "border-red-500 text-red-600 dark:text-red-400"
                        )}
                      >
                        {calculatePercentChange(data.stats.totalProfit, previousData.stats.totalProfit).value >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 mr-0.5" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-0.5" />
                        )}
                        {calculatePercentChange(data.stats.totalProfit, previousData.stats.totalProfit).label}
                      </Badge>
                      <span className="ml-1 text-slate-400">vs prev period</span>
                    </div>
                  ) : (
                    <span className="text-slate-400">Net after fulfillment costs</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
            <div className="absolute top-0 left-0 h-1 w-full bg-blue-500" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Orders</CardTitle>
              <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-900/30 transition-transform group-hover:rotate-12">
                <Package className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{data.stats.totalOrders.toLocaleString()}</div>
              <div className="mt-2 flex items-center text-xs font-medium">
                {compareWithPreviousPeriod && previousData?.stats?.totalOrders ? (
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium",
                        calculatePercentChange(data.stats.totalOrders, previousData.stats.totalOrders).value >= 0
                          ? "border-green-500 text-green-600 dark:text-green-400"
                          : "border-red-500 text-red-600 dark:text-red-400"
                      )}
                    >
                      {calculatePercentChange(data.stats.totalOrders, previousData.stats.totalOrders).value >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-0.5" />
                      )}
                      {calculatePercentChange(data.stats.totalOrders, previousData.stats.totalOrders).label}
                    </Badge>
                    <span className="ml-1 text-slate-400">vs prev period</span>
                  </div>
                ) : (
                  <>
                    <span className="text-blue-600 dark:text-blue-400">{data.stats.pendingOrders}</span>
                    <span className="ml-1 text-slate-400">pending confirmation</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
            <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revenue</CardTitle>
              <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-900/30 transition-transform group-hover:rotate-12">
                <DollarSign className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{formatCurrency(data.stats.totalRevenue)}</div>
              <div className="mt-2 flex items-center text-xs font-medium">
                {compareWithPreviousPeriod && previousData?.stats?.totalRevenue ? (
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium",
                        calculatePercentChange(data.stats.totalRevenue, previousData.stats.totalRevenue).value >= 0
                          ? "border-green-500 text-green-600 dark:text-green-400"
                          : "border-red-500 text-red-600 dark:text-red-400"
                      )}
                    >
                      {calculatePercentChange(data.stats.totalRevenue, previousData.stats.totalRevenue).value >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-0.5" />
                      )}
                      {calculatePercentChange(data.stats.totalRevenue, previousData.stats.totalRevenue).label}
                    </Badge>
                    <span className="ml-1 text-slate-400">vs prev period</span>
                  </div>
                ) : (
                  <>
                    <TrendingUp className="mr-1 h-3 w-3 text-emerald-500" />
                    <span className="text-slate-400">From delivered orders</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
            <div className="absolute top-0 left-0 h-1 w-full bg-violet-500" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Delivery Rate</CardTitle>
              <div className="rounded-2xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-900/30 transition-transform group-hover:rotate-12">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{data.stats.deliveryRate}%</div>
              <div className="mt-2 flex items-center text-xs font-medium">
                {compareWithPreviousPeriod && previousData?.stats?.deliveryRate ? (
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium",
                        calculatePercentChange(data.stats.deliveryRate, previousData.stats.deliveryRate).value >= 0
                          ? "border-green-500 text-green-600 dark:text-green-400"
                          : "border-red-500 text-red-600 dark:text-red-400"
                      )}
                    >
                      {calculatePercentChange(data.stats.deliveryRate, previousData.stats.deliveryRate).value >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-0.5" />
                      )}
                      {calculatePercentChange(data.stats.deliveryRate, previousData.stats.deliveryRate).label}
                    </Badge>
                    <span className="ml-1 text-slate-400">vs prev period</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3 text-violet-500" />
                    <span className="text-slate-400">{data.stats.deliveredOrders} orders successful</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Orders Trend */}
          <Card className="border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Orders Trend</CardTitle>
                  <CardDescription>
                    {compareWithPreviousPeriod ? 'Current (solid) vs Previous (dashed)' : `Daily activity for ${periodLabels[period].toLowerCase()}`}
                  </CardDescription>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.ordersPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                      axisLine={false}
                      tickLine={false}
                      className="text-[11px] font-medium text-slate-400 uppercase"
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      className="text-[11px] font-medium text-slate-400"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                      }}
                      itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                      labelStyle={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', color: '#64748b' }}
                    />
                    {/* Current Period Areas */}
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                      name="Total Orders"
                    />
                    <Area
                      type="monotone"
                      dataKey="delivered"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorDelivered)"
                      name="Delivered"
                    />
                    {/* Previous Period Lines (dashed) */}
                    {compareWithPreviousPeriod && previousData?.ordersPerDay && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="total"
                          data={previousData.ordersPerDay}
                          stroke="#6366f1"
                          strokeWidth={2}
                          strokeDasharray="5,5"
                          dot={false}
                          name="Total (Prev)"
                        />
                        <Line
                          type="monotone"
                          dataKey="delivered"
                          data={previousData.ordersPerDay}
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="5,5"
                          dot={false}
                          name="Delivered (Prev)"
                        />
                      </>
                    )}
                    {compareWithPreviousPeriod && previousData?.ordersPerDay && <Legend />}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Order Status Distribution */}
          <Card className="border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Status Distribution</CardTitle>
                  <CardDescription>Breakdown by current state</CardDescription>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: 'none', 
                        borderRadius: '12px', 
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' 
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend Overlay for Pie */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{data.stats.totalOrders}</span>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-tighter">Total Orders</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* City Stats and Quick Overview */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Orders by City - Takes 2/3 */}
          <Card className="lg:col-span-2 border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Regional Performance</CardTitle>
              <CardDescription>Top cities by order volume and delivery success</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityChartData} layout="vertical" margin={{ left: 40, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                    <XAxis type="number" axisLine={false} tickLine={false} className="text-[11px] font-medium text-slate-400" />
                    <YAxis 
                      dataKey="city" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase"
                      width={80}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: 'none', 
                        borderRadius: '12px', 
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' 
                      }}
                    />
                    <Bar dataKey="total" fill="#6366f1" name="Total Orders" radius={[0, 4, 4, 0]} barSize={20} />
                    <Bar dataKey="delivered" fill="#10b981" name="Delivered" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Platform Metrics - Takes 1/3 */}
          <Card className="border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Quick Metrics</CardTitle>
              <CardDescription>Platform-wide overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 group transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-md ring-1 ring-transparent hover:ring-slate-100 dark:hover:ring-slate-700">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Platform Users</p>
                    <p className="text-xs text-slate-500 font-medium">{data.activeUsersCount} currently active</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{data.usersCount}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 group transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-md ring-1 ring-transparent hover:ring-slate-100 dark:hover:ring-slate-700">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600">
                    <Warehouse className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Active Products</p>
                    <p className="text-xs text-slate-500 font-medium">{data.lowStockProducts.length} low stock alerts</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{data.productsCount}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Operations Pipeline</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                      <Clock className="h-4 w-4 text-amber-500" />
                      New Orders
                    </div>
                    <Badge variant="secondary" className="rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20">{data.stats.newOrders}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                      <Truck className="h-4 w-4 text-indigo-500" />
                      In Transit
                    </div>
                    <Badge variant="secondary" className="rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20">{data.stats.shippedOrders}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                      <XCircle className="h-4 w-4 text-rose-500" />
                      Return Rate
                    </div>
                    <Badge variant="destructive" className="rounded-full">{data.stats.returnedOrders}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders Table */}
        <Card className="border-none bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-4">
            <div>
              <CardTitle className="text-xl font-bold">Recent Logistics Activity</CardTitle>
              <CardDescription>Real-time view of the latest 10 orders</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/orders')}
              className="rounded-xl border-slate-200 hover:bg-slate-50 transition-all"
            >
              Master List
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tracking</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Client</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Product Details</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Destination</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {data.recentOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 cursor-pointer transition-colors"
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {order.trackingNumber}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">{order.customerName}</div>
                          <div className="text-xs text-slate-500 font-medium">{order.customerPhone}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6 hidden md:table-cell">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{order.productName}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{order.city}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(order.codAmount)}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                          statusConfig[order.status]?.color || ''
                        )}>
                          {statusConfig[order.status]?.icon}
                          {statusConfig[order.status]?.label || order.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.recentOrders.length === 0 && (
              <div className="py-20 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Package className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium text-sm">No recent orders found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Critical Alerts */}
        {data.lowStockProducts.length > 0 && (
          <div className="grid gap-6">
            <div className="flex items-center gap-2 px-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              <h2 className="text-lg font-bold tracking-tight">Critical Inventory Alerts</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.lowStockProducts.map((product) => (
                <div key={product.id} className="group relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-rose-200 dark:ring-rose-900/50 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                        <Warehouse className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{product.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.sku}</p>
                      </div>
                    </div>
                    <Badge variant="destructive" className="rounded-full font-bold px-2.5">
                      {product.stock} units
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 rounded-full" 
                        style={{ width: `${Math.max(5, (product.stock / product.lowStockAlert) * 100)}%` }} 
                      />
                    </div>
                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 text-right uppercase tracking-tighter">
                      Critical: Below {product.lowStockAlert} threshold
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-4 h-8 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600">
                    Restock Product
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
