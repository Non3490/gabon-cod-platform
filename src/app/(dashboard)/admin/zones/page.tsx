'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { MapPin, Plus, Pencil, Trash2, User } from 'lucide-react'

interface Zone {
  id: string
  name: string
  city: string
  description: string | null
  deliveryMen: { id: string; name: string }[]
  _count: { orders: number }
}

interface DeliveryMan {
  id: string
  name: string
  phone: string | null
  zoneId: string | null
  zone: { name: string } | null
}

export default function ZonesPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [zones, setZones] = useState<Zone[]>([])
  const [deliveryMen, setDeliveryMen] = useState<DeliveryMen[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    description: '',
    selectedDeliveryMen: [] as string[]
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (userLoading) return
    if (!user) { router.push('/login'); return }
    if (user.role !== 'ADMIN') { router.push('/unauthorized'); return }
    loadData()
  }, [user, userLoading, router])

  const loadData = async () => {
    try {
      const [zonesRes, deliveryMenRes] = await Promise.all([
        fetch('/api/zones').then(r => r.json()),
        fetch('/api/users?role=DELIVERY_MAN').then(r => r.json())
      ])
      setZones(zonesRes.zones ?? [])
      setDeliveryMen(deliveryMenRes.users ?? [])
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (zone: Zone | null = null) => {
    if (zone) {
      setEditingZone(zone)
      setFormData({
        name: zone.name,
        city: zone.city,
        description: zone.description || '',
        selectedDeliveryMen: zone.deliveryMen.map(d => d.id)
      })
    } else {
      setEditingZone(null)
      setFormData({
        name: '',
        city: '',
        description: '',
        selectedDeliveryMen: []
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.city.trim()) {
      toast.error('Name and city are required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/zones', {
        method: editingZone ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingZone?.id,
          name: formData.name,
          city: formData.city,
          description: formData.description,
          deliveryManIds: formData.selectedDeliveryMen
        })
      })

      if (!res.ok) throw new Error('Failed to save zone')

      toast.success(editingZone ? 'Zone updated' : 'Zone created')
      setDialogOpen(false)
      await loadData()
    } catch (error) {
      toast.error('Failed to save zone')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this zone? Orders will no longer be associated with it.')) return

    setDeleting({ ...deleting, [id]: true })
    try {
      const res = await fetch(`/api/zones/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete zone')

      toast.success('Zone deleted')
      await loadData()
    } catch (error) {
      toast.error('Failed to delete zone')
    } finally {
      setDeleting(d => ({ ...d, [id]: false }))
    }
  }

  const getAvailableDeliveryMen = () => {
    return deliveryMen.filter(dm =>
      !formData.selectedDeliveryMen.includes(dm.id) ||
      editingZone?.deliveryMen.some(d => d.id === dm.id)
    )
  }

  if (userLoading || loading) return null

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Delivery Zones</h1>
            <p className="text-muted-foreground">Manage delivery zones and assign delivery men</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Zone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingZone ? 'Edit Zone' : 'Create Zone'}</DialogTitle>
                <DialogDescription>
                  {editingZone ? 'Update zone details and delivery assignments' : 'Create a new delivery zone'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Zone Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Downtown Libreville"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g., Libreville"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Area boundaries, notes, etc."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assigned Delivery Men</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.selectedDeliveryMen.map(dmId => {
                      const dm = deliveryMen.find(d => d.id === dmId)
                      if (!dm) return null
                      return (
                        <Badge key={dm.id} variant="secondary" className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {dm.name}
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              selectedDeliveryMen: formData.selectedDeliveryMen.filter(id => id !== dmId)
                            })}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                  {formData.selectedDeliveryMen.length === 0 && (
                    <p className="text-sm text-muted-foreground">No delivery men assigned</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Available Delivery Men</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                    {getAvailableDeliveryMen().map(dm => (
                      <button
                        key={dm.id}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          selectedDeliveryMen: [...formData.selectedDeliveryMen, dm.id]
                        })}
                        className="w-full text-left px-3 py-2 hover:bg-accent rounded-md text-sm flex items-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        {dm.name}
                        <span className="text-muted-foreground text-xs">
                          {dm.phone && `(${dm.phone})`}
                        </span>
                        {dm.zoneId && dm.zone?.name && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            {dm.zone.name}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editingZone ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {zones.map(zone => (
            <Card key={zone.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <CardTitle className="text-lg">{zone.name}</CardTitle>
                      <CardDescription>{zone.city}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(zone)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deleting[zone.id]}
                      onClick={() => handleDelete(zone.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      {deleting[zone.id] ? '...' : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {zone.description && (
                  <p className="text-sm text-muted-foreground mb-3">{zone.description}</p>
                )}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Delivery Men ({zone.deliveryMen.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {zone.deliveryMen.length > 0 ? (
                        zone.deliveryMen.map(dm => (
                          <Badge key={dm.id} variant="secondary" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            {dm.name}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">None assigned</p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {zone._count.orders} order{zone._count.orders !== 1 ? 's' : ''} in this zone
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {zones.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No zones created yet. Click "Add Zone" to create your first delivery zone.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
