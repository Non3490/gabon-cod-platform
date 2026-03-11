'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Truck,
  RefreshCw,
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Package,
  ArrowRightLeft,
  AlertCircle,
  TrendingUp,
  Lock,
  PhoneCall,
  Navigation,
  Clock as ClockIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CityCount {
  city: string
  assigned: number
  delivered: number
  returned: number
  postponed: number
}

interface DeliveryManStat {
  id: string
  name: string
  email: string
  phone: string | null
  assigned: number
  deliveredToday: number
  returnedToday: number
  postponedToday: number
  cashCollectedToday: number
  pendingRemittance: number
  deliveryRate: number
  byCity: CityCount[]
  feeConfig?: {
    costPerDelivery: number
    bonusAmount: number
    penaltyAmount: number
  }
}

interface Summary {
  totalDeliveredToday: number
  totalCashToday: number
  totalPendingRemittance: number
  totalAssigned: number
  unassignedConfirmed: number
}

const ZONE_COLORS: Record<string, string> = {
  'Libreville':   'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  'Port-Gentil':  'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
  'Franceville':  'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  'Oyem':         'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-GA', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(n)
}

export default function AdminDeliveryOverviewPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [deliveryMen, setDeliveryMen] = useState<DeliveryManStat[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Assign dialog
  const [assignDialog, setAssignDialog] = useState(false)
  const [assignTo, setAssignTo] = useState('')
  const [assignCity, setAssignCity] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [nearestDrivers, setNearestDrivers] = useState<any[]>([])
  const [loadingNearest, setLoadingNearest] = useState(false)

  // Reassign dialog (move from one DM to another)
  const [reassignFrom, setReassignFrom] = useState<DeliveryManStat | null>(null)
  const [reassignTo, setReassignTo] = useState('')
  const [reassigning, setReassigning] = useState(false)

  // Delivery fee config dialog
  const [feeDialog, setFeeDialog] = useState<DeliveryManStat | null>(null)
  const [feeConfig, setFeeConfig] = useState({
    costPerDelivery: 0,
    bonusAmount: 0,
    penaltyAmount: 0
  })
  const [savingFee, setSavingFee] = useState(false)

  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'ADMIN')) router.push('/login')
  }, [user, userLoading, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/delivery-overview')
      if (res.ok) {
        const data = await res.json()
        setDeliveryMen(data.deliveryMen ?? [])
        setSummary(data.summary ?? null)
      }
    } catch {
      toast.error('Failed to load delivery data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'ADMIN') fetchData()
  }, [user, fetchData])

  useEffect(() => {
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleAssign = async () => {
    if (!assignTo) return
    setAssigning(true)
    try {
      const body: Record<string, string> = { deliveryManId: assignTo }
      if (assignCity) body.city = assignCity
      const res = await fetch('/api/admin/delivery-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.assigned} orders assigned & marked SHIPPED → ${data.to}`)
        setAssignDialog(false)
        setAssignTo('')
        setAssignCity('')
        setNearestDrivers([])
        fetchData()
      } else {
        toast.error(data.error || 'Assignment failed')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setAssigning(false)
    }
  }

  const fetchNearestDrivers = async (city: string) => {
    if (!city || city.length < 2) {
      setNearestDrivers([])
      return
    }
    setLoadingNearest(true)
    try {
      const res = await fetch(`/api/delivery/location?address=${encodeURIComponent(city)}&city=${encodeURIComponent(city)}&limit=5`)
      if (res.ok) {
        const data = await res.json()
        setNearestDrivers(data.suggestions || [])
      }
    } catch (error) {
      console.error('Failed to fetch nearest drivers:', error)
    } finally {
      setLoadingNearest(false)
    }
  }

  useEffect(() => {
    if (assignCity) {
      const debounceTimer = setTimeout(() => fetchNearestDrivers(assignCity), 500)
      return () => clearTimeout(debounceTimer)
    }
    setNearestDrivers([])
  }, [assignCity])

  const handleReassign = async () => {
    if (!reassignFrom || !reassignTo) return
    setReassigning(true)
    try {
      const shippedOrders = await fetch(`/api/orders?status=SHIPPED&limit=200`)
      const ordersData = await shippedOrders.json()
      const fromIds = (ordersData.orders ?? [])
        .filter((o: { deliveryManId: string }) => o.deliveryManId === reassignFrom.id)
        .map((o: { id: string }) => o.id)

      if (fromIds.length === 0) {
        toast.info('No SHIPPED orders to reassign')
        setReassignFrom(null)
        setReassigning(false)
        return
      }

      const res = await fetch('/api/admin/delivery-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryManId: reassignTo, orderIds: fromIds })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.assigned} orders reassigned → ${data.to}`)
        setReassignFrom(null)
        setReassignTo('')
        fetchData()
      } else {
        toast.error(data.error || 'Reassignment failed')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setReassigning(false)
    }
  }

  const handleOpenFeeDialog = (dm: DeliveryManStat, currentConfig?: any) => {
    setFeeDialog(dm)
    if (currentConfig) {
      setFeeConfig({
        costPerDelivery: currentConfig.costPerDelivery || 0,
        bonusAmount: currentConfig.bonusAmount || 0,
        penaltyAmount: currentConfig.penaltyAmount || 0
      })
    } else {
      setFeeConfig({ costPerDelivery: 0, bonusAmount: 0, penaltyAmount: 0 })
    }
  }

  const handleSaveFeeConfig = async () => {
    if (!feeDialog) return
    setSavingFee(true)
    try {
      const res = await fetch('/api/delivery-fee-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryManId: feeDialog.id,
          ...feeConfig
        })
      })
      if (!res.ok) throw new Error('Failed to save fee config')
      toast.success('Fee config saved')
      setFeeDialog(null)
      fetchData()
    } catch {
      toast.error('Failed to save fee config')
    } finally {
      setSavingFee(false)
    }
  }

  if (userLoading || !user) return null

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              Delivery Overview
            </h1>
            <p className="text-muted-foreground">Live field operations — auto-refreshes every 30 seconds</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setAssignDialog(true)} className="gap-2">
              <Package className="h-4 w-4" />
              Assign Orders
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Summary KPIs */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Delivered Today', value: summary.totalDeliveredToday, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
              { label: 'Cash Today', value: fmt(summary.totalCashToday), icon: Banknote, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
              { label: 'Pending Remittance', value: fmt(summary.totalPendingRemittance), icon: Lock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
              { label: 'In Transit', value: summary.totalAssigned, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
              { label: 'Unassigned', value: summary.unassignedConfirmed, icon: AlertCircle, color: summary.unassignedConfirmed > 0 ? 'text-rose-600' : 'text-slate-400', bg: summary.unassignedConfirmed > 0 ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-slate-50 dark:bg-slate-900' },
            ].map((s, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                    <p className="text-xl font-bold mt-0.5">{s.value}</p>
                  </div>
                  <div className={cn('p-2.5 rounded-xl', s.bg)}>
                    <s.icon className={cn('h-5 w-5', s.color)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Unassigned warning */}
        {summary && summary.unassignedConfirmed > 0 && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-rose-800 dark:text-rose-200">
                {summary.unassignedConfirmed} confirmed orders waiting for delivery assignment
              </p>
              <p className="text-sm text-rose-700 dark:text-rose-300">
                Click "Assign Orders" to route them to a delivery man.
              </p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => setAssignDialog(true)}>
              Assign Now
            </Button>
          </div>
        )}

        {/* Per delivery man cards */}
        <div className="space-y-4">
          {loading && deliveryMen.length === 0 && (
            <Card className="border-border/50">
              <CardContent className="h-40 flex items-center justify-center text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading...
              </CardContent>
            </Card>
          )}

          {deliveryMen.map((dm) => (
            <Card key={dm.id} className="border-border/50 overflow-hidden">
              {/* Card header row */}
              <CardHeader
                className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(expanded === dm.id ? null : dm.id)}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {dm.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{dm.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-0.5">
                        {dm.phone && (
                          <a
                            href={`tel:${dm.phone}`}
                            className="text-xs text-primary flex items-center gap-1 hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            <PhoneCall className="h-3 w-3" /> {dm.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">In Transit</p>
                      <p className="text-xl font-bold text-blue-600">{dm.assigned}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Delivered</p>
                      <p className="text-xl font-bold text-emerald-600">{dm.deliveredToday}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Returned</p>
                      <p className="text-xl font-bold text-rose-600">{dm.returnedToday}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Postponed</p>
                      <p className="text-xl font-bold text-amber-600">{dm.postponedToday}</p>
                    </div>
                    <div className="text-center min-w-[90px]">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Cash Today</p>
                      <p className="text-base font-bold text-green-600">{fmt(dm.cashCollectedToday)}</p>
                    </div>

                    {/* Delivery rate bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            dm.deliveryRate >= 65 ? 'bg-emerald-500' : dm.deliveryRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          )}
                          style={{ width: `${Math.min(dm.deliveryRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold">{dm.deliveryRate}%</span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs h-8"
                      onClick={e => { e.stopPropagation(); setReassignFrom(dm) }}
                      disabled={dm.assigned === 0}
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                      Reassign
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs h-8"
                      onClick={e => { e.stopPropagation(); handleOpenFeeDialog(dm) }}
                    >
                      <Banknote className="h-3 w-3" />
                      Fees
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Expanded: pending remittance + zone breakdown */}
              {expanded === dm.id && (
                <CardContent className="pt-0 border-t border-border/40">
                  <div className="grid md:grid-cols-2 gap-6 pt-4">
                    {/* Remittance status */}
                    <div className="p-4 rounded-xl bg-muted/30 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5" /> Pending Remittance
                      </p>
                      <p className="text-2xl font-bold text-amber-600">{fmt(dm.pendingRemittance)}</p>
                      <p className="text-xs text-muted-foreground">
                        Total cash collected but not yet reconciled with Admin.
                      </p>
                    </div>

                    {/* City/zone breakdown */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Zone Breakdown
                      </p>
                      {dm.byCity.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No orders assigned yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {dm.byCity.map((zone) => (
                            <div key={zone.city} className="flex items-center gap-3 text-sm">
                              <Badge className={cn('text-xs font-medium w-28 justify-center', ZONE_COLORS[zone.city] ?? 'bg-slate-100 text-slate-700')}>
                                {zone.city}
                              </Badge>
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                <span className="text-blue-600 font-semibold">{zone.assigned} transit</span>
                                <span className="text-emerald-600 font-semibold">{zone.delivered} ✓</span>
                                {zone.returned > 0 && <span className="text-rose-600 font-semibold">{zone.returned} returned</span>}
                                {zone.postponed > 0 && <span className="text-amber-600 font-semibold">{zone.postponed} postponed</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Delivery performance tips */}
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Gabon delivery benchmarks</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-sm text-muted-foreground">
                  <div><span className="font-medium text-foreground">Libreville:</span> target 65–70% delivery rate</div>
                  <div><span className="font-medium text-foreground">Port-Gentil:</span> target 50–60%</div>
                  <div><span className="font-medium text-foreground">Franceville:</span> target 35–45%</div>
                  <div><span className="font-medium text-foreground">Oyem:</span> target 20–35%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assign Orders Dialog */}
      <Dialog open={assignDialog} onOpenChange={(open) => {
        setAssignDialog(open)
        if (!open) {
          setAssignTo('')
          setAssignCity('')
          setNearestDrivers([])
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Assign Orders to Delivery
            </DialogTitle>
            <DialogDescription>
              Assigns confirmed orders to a delivery man and marks them SHIPPED automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Filter by City (optional)</Label>
              <Input
                placeholder="e.g. Libreville, Port-Gentil..."
                value={assignCity}
                onChange={e => setAssignCity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Enter city to see nearest drivers based on GPS location.</p>
            </div>

            {/* Nearest Drivers Suggestions */}
            {assignCity && nearestDrivers.length > 0 && (
              <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <Label className="flex items-center gap-2 text-primary">
                  <Navigation className="h-4 w-4" />
                  Nearest Drivers to {assignCity}
                </Label>
                {loadingNearest ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Finding nearest drivers...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nearestDrivers.map((suggestion, idx) => (
                      <div
                        key={suggestion.driver.id}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors',
                          idx === 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800' : 'hover:bg-muted/50'
                        )}
                        onClick={() => setAssignTo(suggestion.driver.id)}
                      >
                        <div className="flex items-center gap-2">
                          {idx === 0 && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                          <div>
                            <p className="text-sm font-medium">{suggestion.driver.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {suggestion.driver.phone ? suggestion.driver.phone : 'No phone'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-600">{suggestion.distanceKm} km</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ClockIcon className="h-3 w-3" />
                            ~{suggestion.estimatedMinutes} min
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Delivery Man</Label>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery man..." />
                </SelectTrigger>
                <SelectContent>
                  {deliveryMen.map(dm => (
                    <SelectItem key={dm.id} value={dm.id}>
                      {dm.name} ({dm.assigned} in transit)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setAssignDialog(false); setAssignTo(''); setAssignCity(''); setNearestDrivers([]) }}>
              Cancel
            </Button>
            <Button disabled={!assignTo || assigning} onClick={handleAssign} className="gap-2">
              <Truck className="h-4 w-4" />
              {assigning ? 'Assigning...' : 'Assign & Ship'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={!!reassignFrom} onOpenChange={o => { if (!o) { setReassignFrom(null); setReassignTo('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Orders</DialogTitle>
            <DialogDescription>
              Move all <strong>{reassignFrom?.assigned}</strong> in-transit orders from{' '}
              <strong>{reassignFrom?.name}</strong> to another delivery man.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select new delivery man..." />
              </SelectTrigger>
              <SelectContent>
                {deliveryMen
                  .filter(d => d.id !== reassignFrom?.id)
                  .map(dm => (
                    <SelectItem key={dm.id} value={dm.id}>
                      {dm.name} ({dm.assigned} current orders)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setReassignFrom(null); setReassignTo('') }}>
              Cancel
            </Button>
            <Button disabled={!reassignTo || reassigning} onClick={handleReassign} className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              {reassigning ? 'Reassigning...' : 'Reassign All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fee Config Dialog */}
      <Dialog open={!!feeDialog} onOpenChange={o => { if (!o) setFeeDialog(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delivery Fee Config</DialogTitle>
            <DialogDescription>
              Set delivery fee, bonus, and penalty for <strong>{feeDialog?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="costPerDelivery">Cost Per Delivery (XAF)</Label>
              <Input
                id="costPerDelivery"
                type="number"
                value={feeConfig.costPerDelivery}
                onChange={e => setFeeConfig({ ...feeConfig, costPerDelivery: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonusAmount">Bonus Amount (XAF)</Label>
              <Input
                id="bonusAmount"
                type="number"
                value={feeConfig.bonusAmount}
                onChange={e => setFeeConfig({ ...feeConfig, bonusAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="penaltyAmount">Penalty Amount (XAF)</Label>
              <Input
                id="penaltyAmount"
                type="number"
                value={feeConfig.penaltyAmount}
                onChange={e => setFeeConfig({ ...feeConfig, penaltyAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFeeDialog(null)}>
              Cancel
            </Button>
            <Button disabled={savingFee} onClick={handleSaveFeeConfig} className="gap-2">
              <Banknote className="h-4 w-4" />
              {savingFee ? 'Saving...' : 'Save Config'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
