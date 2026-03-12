'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Line, LineChart, Legend
} from 'recharts'
import { BarChart2, TrendingUp, MapPin, Package, Filter, Download, ArrowUpDown, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface AnalyticsData {
  topCities: Array<{ city: string; count: number }>
  topProducts: Array<{ productId: string; productName: string; count: number }>
  deliveryRateByCity: Array<{ city: string; deliveryRate: number }>
  sellers: Array<{ id: string; name: string; email: string }>
  revenueByPeriod: { totalRevenue: number; period: string }
  productsFunnel?: Array<{
    productId: string
    productName: string
    sku: string
    leads: number
    confirmed: number
    shipped: number
    delivered: number
    returned: number
    confirmationRate: number
    deliveryRate: number
    returnRate: number
  }>
}

interface PreviousPeriodData {
  totalRevenue: number
  dailyRevenue: Array<{ date: string; revenue: number }>
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [period, setPeriod] = useState('30d')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [sellerFilter, setSellerFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [productsData, setProductsData] = useState<AnalyticsData['productsFunnel']>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [sortField, setSortField] = useState<keyof AnalyticsData['productsFunnel'][0]>('leads')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [compareWithPreviousPeriod, setCompareWithPreviousPeriod] = useState(false)
  const [previousData, setPreviousData] = useState<PreviousPeriodData | null>(null)
  const [dailyRevenue, setDailyRevenue] = useState<Array<{ date: string; revenue: number }>>([])

  useEffect(() => {
    if (userLoading) return
    if (!user) { router.push('/login'); return }
    if (user.role !== 'ADMIN') { router.push('/unauthorized'); return }
  }, [user, userLoading, router])

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return
    setLoading(true)

    let url = `/api/analytics?period=${period}`
    if (sellerFilter !== 'all') {
      url += `&sellerId=${sellerFilter}`
    }
    if (cityFilter !== 'all') {
      url += `&city=${encodeURIComponent(cityFilter)}`
    }
    if (period === 'custom' && customDateFrom && customDateTo) {
      url += `&dateFrom=${customDateFrom}&dateTo=${customDateTo}`
    }

    // Fetch current period data and daily revenue
    const requests = [fetch(url)]

    // Calculate daily revenue for current period
    let dailyUrl = `/api/analytics/revenue-daily?period=${period}`
    if (sellerFilter !== 'all') {
      dailyUrl += `&sellerId=${sellerFilter}`
    }
    if (cityFilter !== 'all') {
      dailyUrl += `&city=${encodeURIComponent(cityFilter)}`
    }
    if (period === 'custom' && customDateFrom && customDateTo) {
      dailyUrl += `&dateFrom=${customDateFrom}&dateTo=${customDateTo}`
    }
    requests.push(fetch(dailyUrl))

    // Fetch previous period data if comparison is enabled
    if (compareWithPreviousPeriod) {
      const { previousStart, previousEnd } = getPreviousPeriodDates()

      let prevUrl = `/api/analytics?period=custom&dateFrom=${previousStart}&dateTo=${previousEnd}`
      if (sellerFilter !== 'all') {
        prevUrl += `&sellerId=${sellerFilter}`
      }
      if (cityFilter !== 'all') {
        prevUrl += `&city=${encodeURIComponent(cityFilter)}`
      }
      requests.push(fetch(prevUrl))

      let prevDailyUrl = `/api/analytics/revenue-daily?period=custom&dateFrom=${previousStart}&dateTo=${previousEnd}`
      if (sellerFilter !== 'all') {
        prevDailyUrl += `&sellerId=${sellerFilter}`
      }
      if (cityFilter !== 'all') {
        prevDailyUrl += `&city=${encodeURIComponent(cityFilter)}`
      }
      requests.push(fetch(prevDailyUrl))
    }

    Promise.all(requests)
      .then(responses => Promise.all(responses.map(r => r.json())))
      .then(([analyticsData, dailyData, prevAnalyticsData, prevDailyData]) => {
        setData(analyticsData)
        if (dailyData && dailyData.daily) {
          setDailyRevenue(dailyData.daily)
        }
        if (compareWithPreviousPeriod && prevAnalyticsData && prevDailyData) {
          setPreviousData({
            totalRevenue: prevAnalyticsData.revenueByPeriod?.totalRevenue || 0,
            dailyRevenue: prevDailyData.daily || []
          })
        } else {
          setPreviousData(null)
        }
      })
      .finally(() => setLoading(false))

    // Fetch products funnel data
    setProductsLoading(true)
    let productsUrl = `/api/analytics/products?period=${period}`
    if (sellerFilter !== 'all') {
      productsUrl += `&sellerId=${sellerFilter}`
    }
    if (cityFilter !== 'all') {
      productsUrl += `&city=${encodeURIComponent(cityFilter)}`
    }
    if (period === 'custom' && customDateFrom && customDateTo) {
      productsUrl += `&dateFrom=${customDateFrom}&dateTo=${customDateTo}`
    }

    fetch(productsUrl)
      .then(r => r.json())
      .then(res => setProductsData(res.products || []))
      .finally(() => setProductsLoading(false))
  }, [user, period, sellerFilter, cityFilter, customDateFrom, customDateTo, compareWithPreviousPeriod])

  const fmt = (v: number) =>
    new Intl.NumberFormat('fr-GA', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(v)

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

  const getPreviousPeriodDates = () => {
    let previousStart: string, previousEnd: string

    if (period === 'custom' && customDateFrom && customDateTo) {
      const start = new Date(customDateFrom)
      const end = new Date(customDateTo)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const prevStart = new Date(start)
      prevStart.setDate(prevStart.getDate() - daysDiff)
      const prevEnd = new Date(end)
      prevEnd.setDate(prevEnd.getDate() - daysDiff)
      previousStart = prevStart.toISOString().split('T')[0]
      previousEnd = prevEnd.toISOString().split('T')[0]
    } else {
      const periodDays = period === 'today' ? 1 : period === '7d' ? 7 : 30
      const now = new Date()
      const periodStart = new Date(now)
      periodStart.setDate(now.getDate() - periodDays)
      const prevStart = new Date(periodStart)
      prevStart.setDate(prevStart.getDate() - periodDays)
      const prevEnd = new Date(periodStart)
      previousStart = prevStart.toISOString().split('T')[0]
      previousEnd = prevEnd.toISOString().split('T')[0]
    }
    return { previousStart, previousEnd }
  }

  // Sort products data
  const sortedProducts = [...productsData].sort((a, b) => {
    const aVal = a[sortField] as number
    const bVal = b[sortField] as number
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })

  // Handle sort click
  const handleSort = (field: keyof AnalyticsData['productsFunnel'][0]) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    if (!productsData.length) return
    const headers = ['Product Name', 'SKU', 'Leads', 'Confirmed', 'Shipped', 'Delivered', 'Returned', 'Confirmation Rate %', 'Delivery Rate %', 'Return Rate %']
    const rows = sortedProducts.map(p => [
      `"${p.productName}"`,
      `"${p.sku}"`,
      p.leads,
      p.confirmed,
      p.shipped,
      p.delivered,
      p.returned,
      p.confirmationRate,
      p.deliveryRate,
      p.returnRate
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `products-funnel-${period}.csv`)
    link.click()
  }

  if (userLoading || !user) return null

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart2 className="h-6 w-6" />Analytics
            </h1>
            <p className="text-muted-foreground">Platform performance insights</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {user.role === 'ADMIN' && (
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Sellers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sellers</SelectItem>
                {data?.sellers?.map(seller => (
                  <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-40">
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {data?.deliveryRateByCity?.map(city => (
                <SelectItem key={city.city} value={city.city}>{city.city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {period === 'custom' && (
            <div className="flex gap-2">
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="h-9 w-32"
              />
              <span className="self-center text-muted-foreground">to</span>
              <Input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="h-9 w-32"
              />
            </div>
          )}
        </div>

        {/* Period Comparison Toggle */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
          <Switch
            id="compare-period-analytics"
            checked={compareWithPreviousPeriod}
            onCheckedChange={setCompareWithPreviousPeriod}
          />
          <Label htmlFor="compare-period-analytics" className="cursor-pointer text-sm font-medium">
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

        {loading || !data ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue in Period</CardTitle>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{fmt(data.revenueByPeriod.totalRevenue)}</div>
                {compareWithPreviousPeriod && previousData && (
                  <div className="flex items-center gap-1 mt-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        calculatePercentChange(data.revenueByPeriod.totalRevenue, previousData.totalRevenue).value >= 0
                          ? "border-green-500 text-green-600 dark:text-green-400"
                          : "border-red-500 text-red-600 dark:text-red-400"
                      )}
                    >
                      {calculatePercentChange(data.revenueByPeriod.totalRevenue, previousData.totalRevenue).value >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {calculatePercentChange(data.revenueByPeriod.totalRevenue, previousData.totalRevenue).label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">vs prev period</span>
                  </div>
                )}
                {!compareWithPreviousPeriod && (
                  <p className="text-xs text-muted-foreground">From delivered orders</p>
                )}
              </CardContent>
            </Card>

            {/* Revenue Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>
                  {compareWithPreviousPeriod ? 'Current vs previous period' : 'Daily revenue for selected period'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dailyRevenue.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No data yet</p>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" tickFormatter={(value) => fmt(value)} />
                        <Tooltip
                          labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          formatter={(value: number) => [fmt(value), 'Revenue']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        {compareWithPreviousPeriod && previousData?.dailyRevenue ? (
                          <>
                            <Area
                              type="monotone"
                              dataKey="revenue"
                              stroke="#10b981"
                              strokeWidth={2}
                              fill="#10b981"
                              fillOpacity={0.1}
                              name="Current Period"
                            />
                            <Line
                              type="monotone"
                              dataKey="revenue"
                              data={previousData.dailyRevenue}
                              stroke="#34d399"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                              name="Previous Period"
                            />
                            <Legend />
                          </>
                        ) : (
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.3}
                            name="Revenue"
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />Top Products
                  </CardTitle>
                  <CardDescription>Most ordered products</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.topProducts.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">No data yet</p>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.topProducts} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" className="text-xs" />
                          <YAxis
                            dataKey="productName"
                            type="category"
                            width={110}
                            className="text-xs"
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                          />
                          <Bar dataKey="count" fill="#3b82f6" name="Orders" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />Top Cities
                  </CardTitle>
                  <CardDescription>Most orders by city</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.topCities.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">No data yet</p>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.topCities} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" className="text-xs" />
                          <YAxis dataKey="city" type="category" width={80} className="text-xs" />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                          />
                          <Bar dataKey="count" fill="#10b981" name="Orders" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Delivery Rate by City</CardTitle>
                <CardDescription>% of orders successfully delivered per city</CardDescription>
              </CardHeader>
              <CardContent>
                {data.deliveryRateByCity.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No data yet</p>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.deliveryRateByCity}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="city" className="text-xs" />
                        <YAxis
                          domain={[0, 100]}
                          tickFormatter={(v: number) => `${v}%`}
                          className="text-xs"
                        />
                        <Tooltip
                          formatter={(v: number) => [`${v}%`, 'Delivery Rate']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="deliveryRate" fill="#f59e0b" name="Delivery Rate %" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />Products Funnel
                  </CardTitle>
                  <CardDescription>Order status breakdown by product</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={!sortedProducts.length || productsLoading}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : sortedProducts.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No product data yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('productName')}
                          >
                            Product {sortField === 'productName' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('leads')}
                          >
                            Leads {sortField === 'leads' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('confirmed')}
                          >
                            Confirmed {sortField === 'confirmed' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('shipped')}
                          >
                            Shipped {sortField === 'shipped' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('delivered')}
                          >
                            Delivered {sortField === 'delivered' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('returned')}
                          >
                            Returned {sortField === 'returned' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('confirmationRate')}
                          >
                            Conf. Rate {sortField === 'confirmationRate' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('deliveryRate')}
                          >
                            Del. Rate {sortField === 'deliveryRate' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('returnRate')}
                          >
                            Ret. Rate {sortField === 'returnRate' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />)}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedProducts.map((product) => (
                          <TableRow key={product.productId}>
                            <TableCell className="font-medium">{product.productName}</TableCell>
                            <TableCell>{product.leads}</TableCell>
                            <TableCell>{product.confirmed}</TableCell>
                            <TableCell>{product.shipped}</TableCell>
                            <TableCell className="text-green-600 font-medium">{product.delivered}</TableCell>
                            <TableCell className="text-red-600">{product.returned}</TableCell>
                            <TableCell>
                              <span className={cn(
                                'font-medium',
                                product.confirmationRate >= 80 ? 'text-green-600' :
                                product.confirmationRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                              )}>
                                {product.confirmationRate}%
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                'font-medium',
                                product.deliveryRate >= 90 ? 'text-green-600' :
                                product.deliveryRate >= 70 ? 'text-yellow-600' : 'text-red-600'
                              )}>
                                {product.deliveryRate}%
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                'font-medium',
                                product.returnRate <= 5 ? 'text-green-600' :
                                product.returnRate <= 15 ? 'text-yellow-600' : 'text-red-600'
                              )}>
                                {product.returnRate}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
