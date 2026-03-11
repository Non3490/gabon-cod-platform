'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Banknote, RefreshCcw, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface AgentRemit {
  id: string
  name: string
  pendingAmount: number
  ordersCount: number
}

export default function RemittancePage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [agents, setAgents] = useState<AgentRemit[]>([])
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (userLoading) return
    if (!user) { router.push('/login'); return }
    if (user.role !== 'ADMIN') { router.push('/unauthorized'); return }
  }, [user, userLoading, router])

  const fetchAgents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/remit')
      const data = await res.json()
      setAgents(data.agents ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'ADMIN') fetchAgents()
  }, [user])

  const handleCollect = async (agentId: string, agentName: string) => {
    setCollecting(s => ({ ...s, [agentId]: true }))
    try {
      const res = await fetch('/api/finance/remit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryAgentId: agentId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Collected ${fmt(data.remittedAmount)} from ${agentName} (${data.ordersProcessed} orders)`)
      await fetchAgents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to collect')
    } finally {
      setCollecting(s => ({ ...s, [agentId]: false }))
    }
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat('fr-GA', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(v)

  if (userLoading || !user) return null

  const totalPending = agents.reduce((s, a) => s + a.pendingAmount, 0)

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Banknote className="h-6 w-6" />Cash Remittance
            </h1>
            <p className="text-muted-foreground">Collect COD cash from delivery agents</p>
          </div>
          <Button variant="outline" onClick={fetchAgents} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />Refresh
          </Button>
        </div>

        {agents.length > 0 && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/30">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pending Collection</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                    {fmt(totalPending)}
                  </p>
                </div>
                <Banknote className="h-10 w-10 text-green-600 opacity-60" />
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : agents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium">All clear!</p>
              <p className="text-sm">No pending cash remittances from any delivery agent.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Pending Remittances</CardTitle>
              <CardDescription>
                Agents with unremitted delivered COD orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agents.map(agent => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{agent.ordersCount} orders</Badge>
                        <span className="text-sm text-muted-foreground">pending</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-600">
                          {fmt(agent.pendingAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">to collect</p>
                      </div>
                      <Button
                        onClick={() => handleCollect(agent.id, agent.name)}
                        disabled={collecting[agent.id]}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {collecting[agent.id]
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <><CheckCircle className="mr-2 h-4 w-4" />Collect</>
                        }
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
