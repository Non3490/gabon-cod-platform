'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  ArrowUpRight,
  Info,
  PackageSearch,
  Truck,
  Box,
  ImagePlus,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SourcingRequest {
  id: string
  productName: string
  description: string | null
  referenceUrl: string | null
  quantity: number | null
  country: string
  shippingMethod: string
  trackingDetails: string | null
  status: 'SUBMITTED' | 'IN_TRANSIT' | 'RECEIVED' | 'STOCKED' | 'REJECTED'
  adminNote: string | null
  receivedQty: number | null
  receivedImages: string[]
  damagedQty: number | null
  createdAt: string
  seller: {
    id: string
    name: string
    email: string
  }
}

const STATUS_CONFIG = {
  SUBMITTED: {
    label: 'Submitted',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: Clock,
  },
  IN_TRANSIT: {
    label: 'In Transit',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: Truck,
  },
  RECEIVED: {
    label: 'Received',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    icon: CheckCircle2,
  },
  STOCKED: {
    label: 'Stocked',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    icon: Box,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    icon: XCircle,
  },
}

const STATUS_ORDER = ['SUBMITTED', 'IN_TRANSIT', 'RECEIVED', 'STOCKED', 'REJECTED'] as const

export default function AdminSourcingPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [requests, setRequests] = useState<SourcingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const [reviewDialog, setReviewDialog] = useState<SourcingRequest | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('SUBMITTED')
  const [trackingDetails, setTrackingDetails] = useState('')
  const [receivedQty, setReceivedQty] = useState('')
  const [damagedQty, setDamagedQty] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (!user) { router.push('/login'); return }
    if (user.role !== 'ADMIN') { router.push('/unauthorized'); return }
    fetchRequests()
  }, [user, userLoading, router])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sourcing')
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch {
      toast.error('Failed to load sourcing requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchRequests()
    }
  }, [user])

  const openReviewDialog = (req: SourcingRequest) => {
    setReviewDialog(req)
    setAdminNote(req.adminNote || '')
    setSelectedStatus(req.status)
    setTrackingDetails(req.trackingDetails || '')
    setReceivedQty(req.receivedQty?.toString() || '')
    setDamagedQty(req.damagedQty?.toString() || '')
  }

  const closeDialog = () => {
    setReviewDialog(null)
    setAdminNote('')
    setSelectedStatus('SUBMITTED')
    setTrackingDetails('')
    setReceivedQty('')
    setDamagedQty('')
  }

  const handleUpdate = async () => {
    if (!reviewDialog) return
    setSubmitting(true)

    try {
      const updateData: any = { status: selectedStatus, adminNote }

      if (trackingDetails) updateData.trackingDetails = trackingDetails
      if (selectedStatus === 'RECEIVED' || selectedStatus === 'STOCKED') {
        updateData.receivedQty = receivedQty ? parseInt(receivedQty) : null
        updateData.damagedQty = damagedQty ? parseInt(damagedQty) : 0
      }

      const res = await fetch(`/api/sourcing/${reviewDialog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      if (res.ok) {
        toast.success(`Request updated to ${STATUS_CONFIG[selectedStatus]?.label}`)
        closeDialog()
        fetchRequests()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to update request')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (userLoading || !user) return null

  const stats = {
    total: requests.length,
    submitted: requests.filter((r) => r.status === 'SUBMITTED').length,
    inTransit: requests.filter((r) => r.status === 'IN_TRANSIT').length,
    received: requests.filter((r) => r.status === 'RECEIVED').length,
    stocked: requests.filter((r) => r.status === 'STOCKED').length,
    rejected: requests.filter((r) => r.status === 'REJECTED').length,
  }

  const filtered = requests.filter((r) => {
    const matchSearch =
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      r.seller.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus
    return matchSearch && matchStatus
  })

  const canProgressStatus = (newStatus: string) => {
    if (!reviewDialog) return false
    const currentIndex = STATUS_ORDER.indexOf(reviewDialog.status as any)
    const newIndex = STATUS_ORDER.indexOf(newStatus as any)
    return newIndex > currentIndex || newStatus === 'REJECTED'
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PackageSearch className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Sourcing Requests</h1>
            </div>
            <p className="text-muted-foreground">Review and manage seller product sourcing requests</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            { label: 'Submitted', value: stats.submitted, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            { label: 'In Transit', value: stats.inTransit, icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
            { label: 'Received', value: stats.received, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { label: 'Stocked', value: stats.stocked, icon: Box, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-bold mt-0.5">{s.value}</p>
                </div>
                <div className={cn('p-2.5 rounded-xl', s.bg)}>
                  <s.icon className={cn('h-5 w-5', s.color)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters + Table */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product or seller..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['ALL', 'SUBMITTED', 'IN_TRANSIT', 'RECEIVED', 'STOCKED', 'REJECTED'].map((s) => (
                  <Button
                    key={s}
                    variant={filterStatus === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus(s)}
                    className="capitalize text-xs"
                  >
                    {STATUS_CONFIG[s]?.label || s}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-lg overflow-hidden border-t border-border/40">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="pl-6">Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Loading requests...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          No sourcing requests found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((req) => {
                        const cfg = STATUS_CONFIG[req.status]
                        const StatusIcon = cfg.icon
                        return (
                          <TableRow key={req.id} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="pl-6 text-sm text-muted-foreground">
                              {new Date(req.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold">{req.productName}</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-muted-foreground">{req.country} • {req.shippingMethod}</span>
                                  {req.trackingDetails && (
                                    <span className="text-xs text-amber-600 font-medium">Tracking: {req.trackingDetails}</span>
                                  )}
                                  {req.referenceUrl && (
                                    <a
                                      href={req.referenceUrl.startsWith('http') ? req.referenceUrl : `https://${req.referenceUrl}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary flex items-center gap-1 hover:underline"
                                    >
                                      Ref <ArrowUpRight className="h-3 w-3" />
                                    </a>
                                  )}
                                  {req.description && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Info className="h-3 w-3" /> Has description
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{req.seller.name}</span>
                                <span className="text-xs text-muted-foreground">{req.seller.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {req.quantity ?? '—'}
                              {req.receivedQty !== null && <span className="text-xs text-muted-foreground ml-1">({req.receivedQty} received)</span>}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[11px] font-semibold border uppercase tracking-wide',
                                  cfg.color
                                )}
                              >
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-4 text-xs"
                                onClick={() => openReviewDialog(req)}
                              >
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review/Manage Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Sourcing Request</DialogTitle>
            <DialogDescription>
              {reviewDialog?.productName} — requested by {reviewDialog?.seller.name} ({reviewDialog?.country})
            </DialogDescription>
          </DialogHeader>

          {reviewDialog && (
            <div className="space-y-4 py-2">
              {/* Request Details */}
              <div className="p-4 bg-muted/40 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Status:</span>
                    <Badge className={cn('ml-2', STATUS_CONFIG[reviewDialog.status]?.color)}>
                      {STATUS_CONFIG[reviewDialog.status]?.label}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Shipping:</span>
                    <span className="ml-2">{reviewDialog.shippingMethod}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Requested Qty:</span>
                    <span className="ml-2 font-semibold">{reviewDialog.quantity || '—'}</span>
                  </div>
                  {reviewDialog.receivedQty !== null && (
                    <div>
                      <span className="font-medium text-muted-foreground">Received Qty:</span>
                      <span className="ml-2 font-semibold text-emerald-600">{reviewDialog.receivedQty}</span>
                    </div>
                  )}
                </div>
                {reviewDialog.description && (
                  <div className="pt-2 border-t">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm text-muted-foreground">{reviewDialog.description}</p>
                  </div>
                )}
                {reviewDialog.referenceUrl && (
                  <div>
                    <span className="font-medium text-foreground text-xs uppercase tracking-wider">Reference:</span>
                    <a
                      href={reviewDialog.referenceUrl.startsWith('http') ? reviewDialog.referenceUrl : `https://${reviewDialog.referenceUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-2 text-sm"
                    >
                      {reviewDialog.referenceUrl}
                    </a>
                  </div>
                )}
              </div>

              {/* Status Update */}
              <div className="space-y-3 pt-2 border-t">
                <Label>Update Status</Label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {STATUS_ORDER.map((status) => (
                    <option key={status} value={status} disabled={!canProgressStatus(status)}>
                      {STATUS_CONFIG[status]?.label} {status === 'REJECTED' ? '' : (canProgressStatus(status) ? '' : '(locked)')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tracking Details - shown for IN_TRANSIT and beyond */}
              {(selectedStatus === 'IN_TRANSIT' || selectedStatus === 'RECEIVED' || selectedStatus === 'STOCKED') && (
                <div className="space-y-2">
                  <Label htmlFor="trackingDetails">Tracking Details</Label>
                  <Input
                    id="trackingDetails"
                    value={trackingDetails}
                    onChange={(e) => setTrackingDetails(e.target.value)}
                    placeholder="Enter tracking number or carrier info..."
                  />
                </div>
              )}

              {/* Receipt Details - shown for RECEIVED and STOCKED */}
              {(selectedStatus === 'RECEIVED' || selectedStatus === 'STOCKED') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="receivedQty">Received Quantity *</Label>
                    <Input
                      id="receivedQty"
                      type="number"
                      value={receivedQty}
                      onChange={(e) => setReceivedQty(e.target.value)}
                      placeholder="Actual quantity received"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="damagedQty">Damaged Quantity</Label>
                    <Input
                      id="damagedQty"
                      type="number"
                      value={damagedQty}
                      onChange={(e) => setDamagedQty(e.target.value)}
                      placeholder="Number of damaged items"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {/* Admin Note */}
              <div className="space-y-2">
                <Label htmlFor="adminNote">Admin Note / Feedback</Label>
                <Textarea
                  id="adminNote"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Provide feedback or notes about this request..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            {selectedStatus === 'REJECTED' && (
              <Button
                variant="outline"
                className="border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                disabled={submitting}
                onClick={handleUpdate}
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Reject Request
              </Button>
            )}
            {selectedStatus !== 'REJECTED' && (
              <Button
                disabled={submitting || !canProgressStatus(selectedStatus)}
                onClick={handleUpdate}
              >
                {submitting ? (
                  <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Update to {STATUS_CONFIG[selectedStatus]?.label}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
