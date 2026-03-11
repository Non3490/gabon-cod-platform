'use client'

import { useState, useEffect } from 'react'
import { type UserRole } from '@/lib/auth-types'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  phone?: string | null
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error('Failed to fetch user:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  return { user, loading }
}
