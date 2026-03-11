'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Package } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          // Redirect to appropriate dashboard based on role
          switch (data.user.role) {
            case 'ADMIN':
              router.push('/admin')
              break
            case 'SELLER':
              router.push('/orders')
              break
            case 'CALL_CENTER':
              router.push('/call-center')
              break
            case 'DELIVERY':
              router.push('/delivery')
              break
            default:
              router.push('/orders')
          }
        } else {
          router.push('/login')
        }
      } catch (error) {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="bg-primary/10 p-4 rounded-full mb-4">
        <Package className="h-12 w-12 text-primary animate-pulse" />
      </div>
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    </div>
  )
}
