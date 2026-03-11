'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import {
  Users as UsersIcon,
  Plus,
  Search,
  RefreshCcw,
  Edit,
  Trash,
  Mail,
  Phone,
  Shield,
  UserCheck,
  UserX
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface UserItem {
  id: string
  email: string
  name: string
  role: string
  phone: string | null
  active: boolean
  createdAt: string
  _count?: {
    orders: number
  }
}

const roleConfig: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'Administrator', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  SELLER: { label: 'Seller', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  CALL_CENTER: { label: 'Call Center', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  DELIVERY: { label: 'Delivery Agent', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' }
}

export default function UsersPage() {
  const router = useRouter()
  const { user: currentUser, loading: userLoading } = useUser()

  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'SELLER'
  })

  useEffect(() => {
    if (!userLoading && !currentUser) {
      router.push('/login')
    }
    if (!userLoading && currentUser && currentUser.role !== 'ADMIN') {
      router.push('/unauthorized')
    }
  }, [currentUser, userLoading, router])

  const fetchUsers = useCallback(async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter !== 'ALL') params.set('role', roleFilter)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/users?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUser, roleFilter, searchQuery])

  useEffect(() => {
    if (currentUser) {
      fetchUsers()
    }
  }, [fetchUsers, currentUser])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      toast.success('User created successfully')
      setCreateDialogOpen(false)
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'SELLER'
      })
      fetchUsers()
    } catch (error) {
      console.error('Create user error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive })
      })

      if (!response.ok) throw new Error('Failed to update user')

      toast.success(`User ${!currentActive ? 'activated' : 'deactivated'}`)
      fetchUsers()
    } catch (error) {
      console.error('Toggle active error:', error)
      toast.error('Failed to update user')
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <DashboardLayout user={currentUser}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage platform users and their access
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchUsers}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateUser}>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Add a new user to the platform
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(v) => setFormData({ ...formData, role: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrator</SelectItem>
                          <SelectItem value="SELLER">Seller</SelectItem>
                          <SelectItem value="CALL_CENTER">Call Center Agent</SelectItem>
                          <SelectItem value="DELIVERY">Delivery Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create User'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="SELLER">Seller</SelectItem>
                  <SelectItem value="CALL_CENTER">Call Center</SelectItem>
                  <SelectItem value="DELIVERY">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </CardContent>
            </Card>
          ) : (
            users.map((user) => (
              <Card key={user.id} className={!user.active ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-white font-medium",
                        user.role === 'ADMIN' && "bg-purple-500",
                        user.role === 'SELLER' && "bg-blue-500",
                        user.role === 'CALL_CENTER' && "bg-green-500",
                        user.role === 'DELIVERY' && "bg-orange-500"
                      )}>
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <Badge className={roleConfig[user.role]?.color}>
                          {roleConfig[user.role]?.label}
                        </Badge>
                      </div>
                    </div>
                    {!user.active && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>Joined {formatDate(user.createdAt)}</span>
                    </div>
                    {user._count && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UsersIcon className="h-4 w-4" />
                        <span>{user._count.orders} orders assigned</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleToggleActive(user.id, user.active)}
                    >
                      {user.active ? (
                        <>
                          <UserX className="mr-1 h-3 w-3" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-1 h-3 w-3" />
                          Activate
                        </>
                      )}
                    </Button>
                    {user.role === 'DELIVERY' && (
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={async () => {
                          if (!confirm(`Receive all COD cash from ${user.name}? This resets their Cash on Hand to 0.`)) return
                          try {
                            const response = await fetch('/api/finance/remit', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ deliveryAgentId: user.id })
                            })
                            if (response.ok) {
                              toast.success(`Successfully collected cash from ${user.name}`)
                            } else {
                              toast.error('Failed to collect cash')
                            }
                          } catch (e) {
                            toast.error('Server error')
                          }
                        }}
                      >
                        Collect Cash
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
