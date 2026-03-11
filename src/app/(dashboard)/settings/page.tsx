'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout'
import { useUser } from '@/hooks/use-user'
import { Settings, Copy, CheckCircle, AlertCircle, Loader2, Trash2, Phone, Mail, Bell } from 'lucide-react'
import { WebhookCard } from '@/components/settings/WebhookCard'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [activeTab, setActiveTab] = useState('webhooks')

  // Webhooks state
  const [webhookSettings, setWebhookSettings] = useState<Record<string, any>>({
    shopify_secret: '',
    youcan_secret: '',
    dropify_secret: ''
  })

  // Twilio state
  const [twilioSettings, setTwilioSettings] = useState({
    accountSid: '',
    authToken: '',
    apiKey: '',
    apiSecret: '',
    twimlAppSid: '',
    phoneNumber: '',
    configured: false
  })

  // Carriers state
  const [carriers, setCarriers] = useState([])
  const [loadingCarriers, setLoadingCarriers] = useState(false)

  // Notifications state
  const [notificationSettings, setNotificationSettings] = useState({
    smsEnabled: true,
    whatsappEnabled: false,
    smsTemplateConfirmed: '',
    smsTemplateShipped: '',
    smsTemplateDelivered: '',
    smsTemplateReturned: ''
  })

  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/unauthorized')
    }
  }, [user, userLoading, router])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setWebhookSettings(data.settings || {})
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  const fetchTwilioSettings = async () => {
    try {
      const res = await fetch('/api/settings/twilio')
      if (res.ok) {
        const data = await res.json()
        if (data.configured && data.data) {
          setTwilioSettings({
            accountSid: data.data.accountSid,
            authToken: data.data.authToken,
            apiKey: data.data.apiKey,
            apiSecret: data.data.apiSecret === '***' ? '' : data.data.apiSecret,
            twimlAppSid: data.data.twimlAppSid,
            phoneNumber: data.data.phoneNumber,
            configured: true
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch Twilio settings:', error)
    }
  }

  const fetchNotificationSettings = async () => {
    try {
      const res = await fetch('/api/settings/notifications')
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          setNotificationSettings(data.settings)
        }
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error)
    }
  }

  const fetchCarriers = async () => {
    setLoadingCarriers(true)
    try {
      const res = await fetch('/api/settings/carriers')
      if (res.ok) {
        const data = await res.json()
        setCarriers(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch carriers:', error)
      toast.error('Failed to load carriers')
    } finally {
      setLoadingCarriers(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchSettings()
      fetchTwilioSettings()
      fetchCarriers()
      fetchNotificationSettings()
    }
  }, [user])

  const handleSaveWebhook = async (key: string) => {
    const value = webhookSettings[key]
    if (!value) return

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Webhook secret saved')
      await fetchSettings()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save webhook secret')
    }
  }

  const handleDeleteWebhook = async (key: string) => {
    try {
      const res = await fetch(`/api/settings?key=${key}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Webhook secret removed')
      await fetchSettings()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to remove webhook secret')
    }
  }

  const handleSaveTwilio = async () => {
    try {
      const res = await fetch('/api/settings/twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid: twilioSettings.accountSid,
          authToken: twilioSettings.authToken,
          apiKey: twilioSettings.apiKey,
          apiSecret: twilioSettings.apiSecret,
          twimlAppSid: twilioSettings.twimlAppSid,
          phoneNumber: twilioSettings.phoneNumber
        })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }
      toast.success('Twilio settings saved')
      setTwilioSettings(s => ({ ...s, configured: true }))
      await fetchTwilioSettings()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save Twilio settings')
    }
  }

  const handleSaveCarrier = async (carrierData: any) => {
    try {
      const res = await fetch('/api/settings/carriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carrierData)
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Carrier settings saved')
      await fetchCarriers()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save carrier settings')
    }
  }

  const handleDeleteCarrier = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/carriers?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Carrier removed')
      await fetchCarriers()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to remove carrier')
    }
  }

  const handleSaveNotifications = async () => {
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings)
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }
      toast.success('Notification settings saved')
      await fetchNotificationSettings()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save notification settings')
    }
  }

  const handleCopyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('Webhook URL copied to clipboard')
  }

  const twilioFields = [
    { id: 'accountSid', label: 'Account SID', placeholder: 'AC...' },
    { id: 'authToken', label: 'Auth Token', placeholder: 'Your Twilio Auth Token' },
    { id: 'apiKey', label: 'API Key', placeholder: 'SK...' },
    { id: 'twimlAppSid', label: 'TwiML App SID', placeholder: 'AP...' },
    { id: 'phoneNumber', label: 'Phone Number', placeholder: '+212...' }
  ]

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') return null

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure platform integrations and system settings
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4">
            <TabsTrigger value="webhooks" className="data-[state=active]:shadow-sm">
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="twilio" className="data-[state=active]:shadow-sm">
              Twilio
            </TabsTrigger>
            <TabsTrigger value="carriers" className="data-[state=active]:shadow-sm">
              Carriers
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:shadow-sm">
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground mb-4">
                Connect your e-commerce platforms to automatically pull new orders.
                Webhooks are verified using the secret you configure below.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'webhook_secret_shopify', label: 'Shopify', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
                  { key: 'webhook_secret_youcan', label: 'YouCan', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
                  { key: 'webhook_secret_dropify', label: 'Dropify', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
                ].map((platform) => (
                  <WebhookCard
                    key={platform.key}
                    key={platform.key}
                    label={platform.label}
                    color={platform.color}
                    isConfigured={webhookSettings[platform.key]?.configured ?? false}
                    onSave={handleSaveWebhook}
                    onDelete={handleDeleteWebhook}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Twilio Tab */}
          <TabsContent value="twilio">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground mb-4">
                Configure Twilio for softphone and SMS notifications.
              </p>

              {/* Configuration Status */}
              <Card className={cn('mb-6', twilioSettings.configured && 'ring-2 ring-green-500')}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-indigo-600" />
                      Twilio Configuration
                    </CardTitle>
                    <Badge className={cn(twilioSettings.configured
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    )}>
                      {twilioSettings.configured ? 'Configured' : 'Not Configured'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {twilioFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>{field.label}</Label>
                      <Input
                        id={field.id}
                        type={field.id === 'authToken' || field.id === 'apiSecret' ? 'password' : 'text'}
                        placeholder={field.placeholder}
                        value={twilioSettings[field.id as keyof typeof twilioSettings] as string}
                        onChange={(e) => setTwilioSettings(s => ({ ...s, [field.id as keyof typeof twilioSettings]: e.target.value }))}
                        className={field.id === 'authToken' || field.id === 'apiSecret' ? 'font-mono' : ''}
                      />
                    </div>
                  ))}

                  <Button
                    onClick={handleSaveTwilio}
                    disabled={!twilioSettings.accountSid || !twilioSettings.authToken}
                    className="w-full"
                  >
                    Save Twilio Settings
                  </Button>

                  <p className="text-xs text-muted-foreground mt-4">
                    API Key and API Secret are stored securely. Only Auth Token is visible here for validation.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Carriers Tab */}
          <TabsContent value="carriers">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Configure carrier APIs for automatic AWB dispatch.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchCarriers}
                  disabled={loadingCarriers}
                >
                  {loadingCarriers ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Refresh'}
                </Button>
              </div>

              {carriers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <p>No carriers configured</p>
                    <p className="text-sm mt-2">Add carriers to enable AWB dispatch</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {carriers.map((carrier) => {
                    const isActive = carrier.isActive
                    const colors: Record<string, string> = {
                      shipsen: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                      colisswift: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
                      afriquecod: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }

                    return (
                      <Card key={carrier.id} className={cn('transition-all', isActive && 'ring-2 ring-green-500')}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="capitalize">{carrier.name}</CardTitle>
                            <Badge className={cn(isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            )}>
                              {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCarrier(carrier.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`api-key-${carrier.id}`}>API Key</Label>
                            <div className="flex gap-2">
                              <Input
                                id={`api-key-${carrier.id}`}
                                type="text"
                                placeholder="Enter API Key..."
                                value={carrier.apiKey}
                                onChange={(e) => setCarriers(carriers.map(c => c.id === carrier.id ? { ...c, apiKey: e.target.value } : c))}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleCopyWebhookUrl(`${window.location.origin}/api/carriers/webhook/${carrier.name}`)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`api-secret-${carrier.id}`}>API Secret</Label>
                            <Input
                              id={`api-secret-${carrier.id}`}
                              type="password"
                              placeholder="Enter API Secret..."
                              value={carrier.apiSecret || ''}
                              onChange={(e) => setCarriers(carriers.map(c => c.id === carrier.id ? { ...c, apiSecret: e.target.value } : c))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`webhook-${carrier.id}`}>Webhook URL</Label>
                            <div className="flex gap-2">
                              <Input
                                id={`webhook-${carrier.id}`}
                                type="text"
                                placeholder="Carrier's webhook URL..."
                                value={carrier.webhookUrl || ''}
                                onChange={(e) => setCarriers(carriers.map(c => c.id === carrier.id ? { ...c, webhookUrl: e.target.value } : c))}
                                readOnly
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleCopyWebhookUrl(`${window.location.origin}/api/carriers/webhook/${carrier.name}`)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <Label>Active</Label>
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={(e) => setCarriers(carriers.map(c => c.id === carrier.id ? { ...c, isActive: e.target.checked } : c))}
                              className="w-4 h-4"
                            />
                          </div>
                        </CardContent>
                        </Card>
                      )
                    })
                  })
                </div>
              )}
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground mb-4">
                Configure SMS and WhatsApp notifications for order updates.
              </p>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <Label>Enable SMS Notifications</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="sms-enabled"
                        checked={notificationSettings.smsEnabled}
                        onChange={(e) => setNotificationSettings(s => ({ ...s, smsEnabled: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Send SMS when orders are confirmed and shipped</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <Label>Enable WhatsApp Notifications</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="whatsapp-enabled"
                        checked={notificationSettings.whatsappEnabled}
                        onChange={(e) => setNotificationSettings(s => ({ ...s, whatsappEnabled: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-muted-foreground">Coming soon</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium mb-2">Message Templates (French)</h4>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="sms-confirmed">Order Confirmed</Label>
                        <Input
                          id="sms-confirmed"
                          type="text"
                          placeholder="Bonjour {name}, votre commande #{code} a été confirmée..."
                          value={notificationSettings.smsTemplateConfirmed}
                          onChange={(e) => setNotificationSettings(s => ({ ...s, smsTemplateConfirmed: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="sms-shipped">Order Shipped</Label>
                        <Input
                          id="sms-shipped"
                          type="text"
                          placeholder="Bonjour {name}, votre commande #{code} est en route. Numéro de suivi: {tracking}..."
                          value={notificationSettings.smsTemplateShipped}
                          onChange={(e) => setNotificationSettings(s => ({ ...s, smsTemplateShipped: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="sms-delivered">Order Delivered</Label>
                        <Input
                          id="sms-delivered"
                          type="text"
                          placeholder="Bonjour {name}, votre commande #{code} a été livrée avec succès..."
                          value={notificationSettings.smsTemplateDelivered}
                          onChange={(e) => setNotificationSettings(s => ({ ...s, smsTemplateDelivered: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="sms-returned">Order Returned</Label>
                        <Input
                          id="sms-returned"
                          type="text"
                          placeholder="Bonjour {name}, votre commande #{code} n'a pas pu être livrée..."
                          value={notificationSettings.smsTemplateReturned}
                          onChange={(e) => setNotificationSettings(s => ({ ...s, smsTemplateReturned: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveNotifications}
                    className="w-full"
                  >
                    Save Notification Settings
                  </Button>

                  <p className="text-xs text-muted-foreground mt-4">
                    Use {name}, {code}, {tracking} as placeholders. They will be replaced with actual order data when sending.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
