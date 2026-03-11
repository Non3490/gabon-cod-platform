'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  Phone,
  Megaphone,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  PieChart,
  Download
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
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { cn } from '@/lib/utils'

interface FinancialStats {
  totalRevenue: number
  totalCosts: number
  totalProfit: number
  deliveryRate: number
  ordersCount: number
  deliveredCount: number
  returnedCount: number
  pendingCOD: number
  collectedCOD: number
  costsBreakdown: {
    product: number
    shipping: number
    callCenter: number
    platform: number
    adSpend: number
  }
}

interface DailyData {
  date: string
  revenue: number
  profit: number
  orders: number
}

interface ExpenseData {
  id: string
  category: string
  amount: number
  description: string | null
  createdAt: string
  order?: {
    trackingNumber: string
    customerName: string
  }
}

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export default function FinancePage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()

  const [stats, setStats] = useState<FinancialStats | null>(null)
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d' | 'custom'>('7d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [compareWithPreviousPeriod, setCompareWithPreviousPeriod] = useState(false)
  const [previousStats, setPreviousStats] = useState<FinancialStats | null>(null)
  const [previousDailyData, setPreviousDailyData] = useState<DailyData[]>([])

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
    }
  }, [user, userLoading, router])

  const fetchData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      // Build query parameters for date range
      let queryParams = `period=${period}`
      let previousQueryParams = ''
      if (period === 'custom' && customStartDate && customEndDate) {
        queryParams += `&startDate=${customStartDate}&endDate=${customEndDate}`

        // Calculate previous period for custom range
        if (compareWithPreviousPeriod) {
          const start = new Date(customStartDate)
          const end = new Date(customEndDate)
          const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          const prevStart = new Date(start)
          prevStart.setDate(prevStart.getDate() - daysDiff)
          const prevEnd = new Date(end)
          prevEnd.setDate(prevEnd.getDate() - daysDiff)
          previousQueryParams = `period=custom&startDate=${prevStart.toISOString().split('T')[0]}&endDate=${prevEnd.toISOString().split('T')[0]}`
        }
      } else if (compareWithPreviousPeriod) {
        // Calculate previous period for preset periods
        const periodDays = period === 'today' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90
        const now = new Date()
        const periodStart = new Date(now)
        periodStart.setDate(now.getDate() - periodDays)
        const prevStart = new Date(periodStart)
        prevStart.setDate(prevStart.getDate() - periodDays)
        const prevEnd = new Date(periodStart)

        if (period === 'today') {
          previousQueryParams = `period=custom&startDate=${prevStart.toISOString().split('T')[0]}&endDate=${prevEnd.toISOString().split('T')[0]}`
        } else {
          // For 7d, 30d, 90d, use the period value with adjusted start date
          // This is handled by the API's logic, so we use the same period value
          const prevPeriodStart = new Date(now)
          prevPeriodStart.setDate(now.getDate() - (periodDays * 2))
          const prevPeriodEnd = new Date(now)
          prevPeriodEnd.setDate(now.getDate() - periodDays)
          previousQueryParams = `period=custom&startDate=${prevPeriodStart.toISOString().split('T')[0]}&endDate=${prevPeriodEnd.toISOString().split('T')[0]}`
        }
      }

      const requests = [
        fetch(`/api/finance/stats?${queryParams}`),
        fetch(`/api/finance/daily?${queryParams}`),
        fetch('/api/expenses?limit=20')
      ]

      if (compareWithPreviousPeriod && previousQueryParams) {
        requests.push(
          fetch(`/api/finance/stats?${previousQueryParams}`),
          fetch(`/api/finance/daily?${previousQueryParams}`)
        )
      }

      const responses = await Promise.all(requests)

      if (responses[0].ok) {
        const data = await responses[0].json()
        setStats(data)
      }

      if (responses[1].ok) {
        const data = await responses[1].json()
        setDailyData(data.daily)
      }

      if (responses[2].ok) {
        const data = await responses[2].json()
        setExpenses(data.expenses)
      }

      if (compareWithPreviousPeriod && previousQueryParams) {
        if (responses[3] && responses[3].ok) {
          const data = await responses[3].json()
          setPreviousStats(data)
        }
        if (responses[4] && responses[4].ok) {
          const data = await responses[4].json()
          setPreviousDailyData(data.daily)
        }
      } else {
        setPreviousStats(null)
        setPreviousDailyData([])
      }
    } catch (error) {
      console.error('Failed to fetch finance data:', error)
    } finally {
      setLoading(false)
    }
  }, [user, period, customStartDate, customEndDate, compareWithPreviousPeriod])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [fetchData, user])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GA', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

  const handleExport = async () => {
    try {
      let queryParams = `period=${period}`
      if (period === 'custom' && customStartDate && customEndDate) {
        queryParams += `&startDate=${customStartDate}&endDate=${customEndDate}`
      }

      const response = await fetch(`/api/finance/export?${queryParams}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `finance-export-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export finance data:', error)
      alert('Failed to export finance data')
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !stats) return null

  const costBreakdownData = [
    { name: 'Product Cost', value: stats.costsBreakdown.product, color: '#3b82f6' },
    { name: 'Shipping', value: stats.costsBreakdown.shipping, color: '#f59e0b' },
    { name: 'Call Center', value: stats.costsBreakdown.callCenter, color: '#8b5cf6' },
    { name: 'Platform Fee', value: stats.costsBreakdown.platform, color: '#f97316' },
    { name: 'Ad Spend', value: stats.costsBreakdown.adSpend, color: '#ef4444' }
  ].filter(d => d.value > 0)

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financial Dashboard</h1>
            <p className="text-muted-foreground">
              Track revenue, costs, and profitability
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {period === 'custom' && (
              <>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-[140px]"
                />
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-[140px]"
                />
              </>
            )}
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Period Comparison Toggle */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
          <Switch
            id="compare-period"
            checked={compareWithPreviousPeriod}
            onCheckedChange={setCompareWithPreviousPeriod}
          />
          <Label htmlFor="compare-period" className="cursor-pointer text-sm font-medium">
            Compare with previous period
          </Label>
          {compareWithPreviousPeriod && (
            <Badge variant="outline" className="ml-auto text-xs">
              {period === 'today' ? 'Same day last week' :
               period === 'custom' ? 'Previous custom range' :
               `Previous ${period}`}
            </Badge>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                  {compareWithPreviousPeriod && previousStats && (
                    <div className="flex items-center gap-1 mt-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium",
                          calculatePercentChange(stats.totalRevenue, previousStats.totalRevenue).value >= 0
                            ? "border-green-500 text-green-600 dark:text-green-400"
                            : "border-red-500 text-red-600 dark:text-red-400"
                        )}
                      >
                        {calculatePercentChange(stats.totalRevenue, previousStats.totalRevenue).value >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        {calculatePercentChange(stats.totalRevenue, previousStats.totalRevenue).label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">vs prev period</span>
                    </div>
                  )}
                  {!compareWithPreviousPeriod && (
                    <p className="text-xs text-muted-foreground mt-1">
                      From {stats.deliveredCount} delivered orders
                    </p>
                  )}
                </div>
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {user.role === 'ADMIN' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Costs</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(stats.totalCosts)}
                    </p>
                    {compareWithPreviousPeriod && previousStats && (
                      <div className="flex items-center gap-1 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            calculatePercentChange(stats.totalCosts, previousStats.totalCosts).value >= 0
                              ? "border-red-500 text-red-600 dark:text-red-400"
                              : "border-green-500 text-green-600 dark:text-green-400"
                          )}
                        >
                          {calculatePercentChange(stats.totalCosts, previousStats.totalCosts).value >= 0 ? (
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                          )}
                          {calculatePercentChange(stats.totalCosts, previousStats.totalCosts).label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">vs prev period</span>
                      </div>
                    )}
                    {!compareWithPreviousPeriod && (
                      <p className="text-xs text-muted-foreground mt-1">
                        All operational expenses
                      </p>
                    )}
                  </div>
                  <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full">
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {user.role === 'ADMIN' && (
            <Card className={stats.totalProfit >= 0 ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      stats.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(stats.totalProfit)}
                    </p>
                    {compareWithPreviousPeriod && previousStats && (
                      <div className="flex items-center gap-1 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            calculatePercentChange(stats.totalProfit, previousStats.totalProfit).value >= 0
                              ? "border-green-500 text-green-600 dark:text-green-400"
                              : "border-red-500 text-red-600 dark:text-red-400"
                          )}
                        >
                          {calculatePercentChange(stats.totalProfit, previousStats.totalProfit).value >= 0 ? (
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                          )}
                          {calculatePercentChange(stats.totalProfit, previousStats.totalProfit).label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">vs prev period</span>
                      </div>
                    )}
                    {!compareWithPreviousPeriod && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Revenue minus all costs
                      </p>
                    )}
                  </div>
                  <div className={cn(
                    "p-3 rounded-full",
                    stats.totalProfit >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"
                  )}>
                    <DollarSign className={cn(
                      "h-6 w-6",
                      stats.totalProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Rate</p>
                  <p className="text-2xl font-bold">{stats.deliveryRate}%</p>
                  {compareWithPreviousPeriod && previousStats && (
                    <div className="flex items-center gap-1 mt-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium",
                          calculatePercentChange(stats.deliveryRate, previousStats.deliveryRate).value >= 0
                            ? "border-green-500 text-green-600 dark:text-green-400"
                            : "border-red-500 text-red-600 dark:text-red-400"
                        )}
                      >
                        {calculatePercentChange(stats.deliveryRate, previousStats.deliveryRate).value >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        {calculatePercentChange(stats.deliveryRate, previousStats.deliveryRate).label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">vs prev period</span>
                    </div>
                  )}
                  {!compareWithPreviousPeriod && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.returnedCount} returned
                    </p>
                  )}
                </div>
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COD Tracking */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending COD Collection</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(stats.pendingCOD)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From orders in transit
                  </p>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-full">
                  <Truck className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Collected COD</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.collectedCOD)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ready for payout
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Revenue & Profit Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Profit Trend</CardTitle>
              <CardDescription>
                {compareWithPreviousPeriod ? 'Current (solid) vs Previous (dashed)' : 'Daily financial performance'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      labelFormatter={formatDate}
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    {/* Current Period */}
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      name="Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      name="Profit"
                    />
                    {/* Previous Period (dashed lines) */}
                    {compareWithPreviousPeriod && previousDailyData.length > 0 && (
                      <>
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          data={previousDailyData}
                          stroke="#10b981"
                          strokeDasharray="5,5"
                          fill="none"
                          fillOpacity={0}
                          name="Revenue (Prev)"
                        />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          data={previousDailyData}
                          stroke="#3b82f6"
                          strokeDasharray="5,5"
                          fill="none"
                          fillOpacity={0}
                          name="Profit (Prev)"
                        />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          {user.role === 'ADMIN' && (
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Distribution of operational costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {costBreakdownData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={costBreakdownData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {costBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No cost data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cost Details */}
        {user.role === 'ADMIN' && (
          <Card>
            <CardHeader>
              <CardTitle>Cost Details</CardTitle>
              <CardDescription>Breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Product Cost</p>
                    <p className="font-bold">{formatCurrency(stats.costsBreakdown.product)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
                  <div className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded-lg">
                    <Truck className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shipping</p>
                    <p className="font-bold">{formatCurrency(stats.costsBreakdown.shipping)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                  <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
                    <Phone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Call Center</p>
                    <p className="font-bold">{formatCurrency(stats.costsBreakdown.callCenter)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg">
                    <Megaphone className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ad Spend</p>
                    <p className="font-bold">{formatCurrency(stats.costsBreakdown.adSpend)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Expenses - TODO: Fix syntax error */}
        {user.role === 'ADMIN' && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Latest cost entries</CardDescription>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No expenses recorded yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Category</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Description</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense.id} className="border-b last:border-0">
                          <td className="py-3 px-2 text-sm text-muted-foreground">
                            {formatDate(expense.createdAt)}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant="outline">{expense.category}</Badge>
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {expense.description || '-'}
                            {expense.order && (
                              <span className="text-muted-foreground ml-2">
                                ({expense.order.trackingNumber})
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right font-medium text-red-600">
                            -{formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
 
