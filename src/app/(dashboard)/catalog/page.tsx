'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ShoppingBag, 
  Heart, 
  Search, 
  RefreshCcw, 
  Package, 
  Globe2, 
  Tag, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

interface CatalogProduct {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  costPrice: number
  category: string | null
  countryAvailable: string | null
  isFavorited: boolean
}

export default function CatalogPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (!userLoading && !user) router.push('/login')
  }, [user, userLoading, router])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/catalog?${params}`)
      if (res.ok) setProducts((await res.json()).products)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchProducts()
  }, [user])

  const toggleFavorite = async (id: string) => {
    setTogglingId(id)
    try {
      const res = await fetch('/api/catalog/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogProductId: id })
      })
      if (!res.ok) throw new Error('Failed')
      const { favorited } = await res.json()
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isFavorited: favorited } : p))
      toast.success(favorited ? 'Added to favorites' : 'Removed from favorites', {
        icon: favorited ? <Heart className="h-4 w-4 fill-red-500 text-red-500" /> : <Heart className="h-4 w-4" />
      })
    } catch {
      toast.error('Failed to update favorite')
    } finally {
      setTogglingId(null)
    }
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-GA', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(v)

  if (userLoading || !user) return null

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 shadow-2xl border border-white/10 group">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-[100px]" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-violet-500/10 blur-[100px]" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Premium Inventory
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                Product <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Catalog</span>
              </h1>
              <p className="text-slate-400 max-w-md">
                Browse our curated selection of high-performing products for your store.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group/search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/search:text-indigo-400 transition-colors" />
                <Input
                  placeholder="Search products..."
                  className="pl-10 w-full md:w-64 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 transition-all rounded-xl"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchProducts()}
                />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={fetchProducts}
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" />
              <div className="absolute inset-2 rounded-full border-b-2 border-violet-500 animate-spin-slow" />
            </div>
            <p className="text-slate-500 font-medium animate-pulse">Loading amazing products...</p>
          </div>
        ) : products.length === 0 ? (
          <Card className="border-dashed bg-slate-50/50 dark:bg-slate-900/50">
            <CardContent className="py-20 text-center space-y-4">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
                <Package className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">No products found</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                We couldn't find any products matching your search criteria. Try a different keyword or refresh the page.
              </p>
              <Button onClick={() => { setSearch(''); fetchProducts(); }} variant="link" className="text-indigo-600">
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(p => (
              <Card 
                key={p.id} 
                className="group overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
                  {p.imageUrl ? (
                    <img 
                      src={p.imageUrl} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                    </div>
                  )}
                  
                  {/* Image Overlays */}
                  <div className="absolute top-3 left-3">
                    {p.category && (
                      <Badge className="bg-white/90 backdrop-blur-md text-slate-900 hover:bg-white border-none font-semibold shadow-sm">
                        <Tag className="h-3 w-3 mr-1 text-indigo-500" />
                        {p.category}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="absolute top-3 right-3 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                    <Button
                      variant="secondary"
                      size="icon"
                      className={`h-9 w-9 rounded-full shadow-lg backdrop-blur-md ${p.isFavorited ? 'bg-red-50 text-red-500' : 'bg-white/90 text-slate-600'}`}
                      disabled={togglingId === p.id}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                    >
                      <Heart className={`h-4.5 w-4.5 transition-colors ${p.isFavorited ? 'fill-current' : ''}`} />
                    </Button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                    <Button className="w-full bg-white text-slate-900 hover:bg-indigo-50 border-none font-bold">
                      View Details
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">
                        {p.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Cost Price</span>
                      <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        {fmt(p.costPrice)}
                      </span>
                    </div>
                    {p.countryAvailable && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Region</span>
                        <div className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          <Globe2 className="h-3 w-3 text-emerald-500" />
                          {p.countryAvailable}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </DashboardLayout>
  )
}
