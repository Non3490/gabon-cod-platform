'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Warehouse, Plus, AlertTriangle, BarChart3, Calendar, Search } from 'lucide-react'
import { toast } from 'sonner'

interface Stock {
  id: string
  warehouse: string
  quantity: number
  alertLevel: number
  product: { id: string; name: string; sku: string; costPrice: number; sellPrice: number }
}

interface Product {
  id: string
  sku: string
  name: string
  isActive: boolean
  stocks: Stock[]
  totalStock: number
}

interface StockSnapshot {
  id: string
  stockId: string
  date: string
  initialStock: number
  inForDelivery: number
  outForDelivery: number
  finalStock: number
  stock?: Stock
  product?: { name: string; sku: string }
}

export default function SellerStockPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [snapshots, setSnapshots] = useState<StockSnapshot[]>([])
  const [snapshotsLoading, setSnapshotsLoading] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showMovement, setShowMovement] = useState(false)
  const [selectedStockId, setSelectedStockId] = useState('')
  const [newProduct, setNewProduct] = useState({ sku: '', name: '', costPrice: '', sellPrice: '', warehouse: 'Main', initialStock: '0', alertLevel: '5' })
  const [movement, setMovement] = useState({ type: 'IN', quantity: '', reason: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (!user) { router.push('/login'); return }
    if (user.role !== 'SELLER' && user.role !== 'ADMIN') { router.push('/unauthorized'); return }
  }, [user, userLoading, router])

  useEffect(() => {
    if (user) {
      fetchProducts()
      if (activeTab === 'reports') fetchSnapshots()
    }
  }, [user])

  useEffect(() => {
    if (activeTab === 'reports') fetchSnapshots()
  }, [activeTab])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data.products ?? [])
    } finally {
      setLoading(false)
    }
  }

  const fetchSnapshots = async () => {
    setSnapshotsLoading(true)
    try {
      const res = await fetch('/api/stock-snapshots?limit=100')
      const data = await res.json()
      setSnapshots(data.snapshots ?? [])
    } catch (error) {
      toast.error('Failed to load snapshots')
    } finally {
      setSnapshotsLoading(false)
    }
  }

  const filteredProducts = search
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      )
    : products

  const handleAddProduct = async () => {
    if (!newProduct.sku || !newProduct.name) return toast.error('SKU and name required')
    setSaving(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProduct,
          costPrice: parseFloat(newProduct.costPrice) || 0,
          sellPrice: parseFloat(newProduct.sellPrice) || 0,
          initialStock: parseInt(newProduct.initialStock) || 0,
          alertLevel: parseInt(newProduct.alertLevel) || 5
        })
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Product created')
      setShowAddProduct(false)
      setNewProduct({ sku: '', name: '', costPrice: '', sellPrice: '', warehouse: 'Main', initialStock: '0', alertLevel: '5' })
      fetchProducts()
    } catch { toast.error('Failed to create product') } finally { setSaving(false) }
  }

  const handleMovement = async () => {
    if (!movement.quantity) return toast.error('Quantity required')
    setSaving(true)
    try {
      const res = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockId: selectedStockId, ...movement, quantity: parseInt(movement.quantity) })
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Stock updated')
      setShowMovement(false)
      setMovement({ type: 'IN', quantity: '', reason: '' })
      fetchProducts()
    } catch { toast.error('Failed to update stock') } finally { setSaving(false) }
  }

  if (userLoading || !user) return null

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Warehouse className="h-6 w-6" />Stock Management</h1>
            <p className="text-muted-foreground">Manage your product inventory</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            {activeTab === 'overview' && (
              <Button onClick={() => setShowAddProduct(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              Stock Overview
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Daily Reports
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p>No products yet. Add your first product.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Low Stock Alerts Section */}
                {filteredProducts.some(p => p.stocks.some(s => s.quantity <= s.alertLevel) || p.stocks.every(s => s.quantity === 0)) && (
                  <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-800">
                        <AlertTriangle className="h-5 w-5" />
                        Low Stock Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {filteredProducts.filter(p =>
                          p.stocks.some(s => s.quantity <= s.alertLevel) ||
                          p.stocks.every(s => s.quantity === 0)
                        ).map(p => (
                          <div key={p.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-orange-200">
                            <div className="flex-1">
                              <span className="font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">SKU: {p.sku}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={p.stocks.every(s => s.quantity === 0) ? 'destructive' : 'secondary'}>
                                {p.stocks.every(s => s.quantity === 0) ? 'Out of Stock' : 'Low Stock'}
                              </Badge>
                              <span className="font-bold text-lg">{p.totalStock}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {filteredProducts.filter(p =>
                        p.stocks.some(s => s.quantity <= s.alertLevel) ||
                        p.stocks.every(s => s.quantity === 0)
                      ).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          All products are well-stocked!
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
                <div className="grid gap-4">
                  {filteredProducts.map(product => (
                    <Card key={product.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{product.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={product.isActive ? 'default' : 'secondary'}>
                              {product.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <span className="text-2xl font-bold">{product.totalStock}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {product.stocks.map(stock => (
                            <div key={stock.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                              <div>
                                <span className="text-sm font-medium">{stock.warehouse}</span>
                                <span className="text-xs text-muted-foreground ml-2">Alert at: {stock.alertLevel}</span>
                                {stock.quantity <= stock.alertLevel && (
                                  <AlertTriangle className="inline ml-2 h-3 w-3 text-orange-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold">{stock.quantity}</span>
                                <Button size="sm" variant="outline" onClick={() => {
                                  setSelectedStockId(stock.id)
                                  setShowMovement(true)
                                }}>
                                  Adjust
                                </Button>
                              </div>
                            </div>
                          ))}
                          {product.stocks.length === 0 && (
                            <p className="text-sm text-muted-foreground">No warehouses configured</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Daily Stock Reports
                </CardTitle>
                <CardDescription>View historical stock snapshots over time</CardDescription>
              </CardHeader>
              <CardContent>
                {snapshotsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : snapshots.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-40" />
                    <p>No stock snapshots available yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Initial</TableHead>
                          <TableHead className="text-right">In</TableHead>
                          <TableHead className="text-right">Out</TableHead>
                          <TableHead className="text-right">Final</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {snapshots.map((snapshot, index) => (
                          <TableRow key={snapshot.id}>
                            <TableCell className="text-sm">
                              {new Date(snapshot.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: '2-digit'
                              })}
                            </TableCell>
                            <TableCell className="font-medium">{snapshot.product?.name || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{snapshot.product?.sku || '—'}</TableCell>
                            <TableCell className="text-right">{snapshot.initialStock}</TableCell>
                            <TableCell className="text-right text-emerald-600">+{snapshot.inForDelivery}</TableCell>
                            <TableCell className="text-right text-rose-600">-{snapshot.outForDelivery}</TableCell>
                            <TableCell className="text-right font-bold">{snapshot.finalStock}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Product Dialog */}
        <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {[
                { label: 'SKU *', key: 'sku', placeholder: 'e.g. PROD-001' },
                { label: 'Name *', key: 'name', placeholder: 'Product name' },
                { label: 'Cost Price (XAF)', key: 'costPrice', placeholder: '0' },
                { label: 'Sell Price (XAF)', key: 'sellPrice', placeholder: '0' },
                { label: 'Warehouse', key: 'warehouse', placeholder: 'Main' },
                { label: 'Initial Stock', key: 'initialStock', placeholder: '0' },
                { label: 'Alert Level', key: 'alertLevel', placeholder: '5' }
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    placeholder={placeholder}
                    value={(newProduct as Record<string, string>)[key]}
                    onChange={e => setNewProduct(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <Button className="w-full" onClick={handleAddProduct} disabled={saving}>
                {saving ? 'Creating...' : 'Create Product'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stock Movement Dialog */}
        <Dialog open={showMovement} onOpenChange={setShowMovement}>
          <DialogContent>
            <DialogHeader><DialogTitle>Adjust Stock</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                  value={movement.type}
                  onChange={e => setMovement(m => ({ ...m, type: e.target.value }))}
                >
                  <option value="IN">IN (receive)</option>
                  <option value="OUT">OUT (dispatch)</option>
                  <option value="RETURN">RETURN (customer return)</option>
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                </select>
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input type="number" min="1" value={movement.quantity} onChange={e => setMovement(m => ({ ...m, quantity: e.target.value }))} />
              </div>
              <div>
                <Label>Reason</Label>
                <Input placeholder="Optional note" value={movement.reason} onChange={e => setMovement(m => ({ ...m, reason: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleMovement} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
