import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/agents/heartbeat
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Only call center agents use heartbeat
    if (user.role !== 'CALL_CENTER') {
      return NextResponse.json({ error: 'Call center only' }, { status: 403 })
    }

    const now = new Date()

    // Upsert agent session
    const session = await db.agentSession.upsert({
      where: { userId: user.id },
      update: {
        lastSeen: now,
        isOnline: true
      },
      create: {
        userId: user.id,
        lastSeen: now,
        isOnline: true
      }
    })

    // Agent is online if lastSeen within 60 seconds
    const isOnline = session ? (now.getTime() - session.lastSeen.getTime()) < 60000 : false

    return NextResponse.json({
      success: true,
      isOnline,
      lastSeen: session?.lastSeen
    })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/agents/heartbeat
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Only call center agents can check their own status
    if (user.role !== 'CALL_CENTER') {
      return NextResponse.json({ error: 'Call center only' }, { status: 403 })
    }

    const session = await db.agentSession.findUnique({
      where: { userId: user.id }
    })

    if (!session) {
      return NextResponse.json({
        isOnline: false,
        lastSeen: null
      })
    }

    // Agent is online if lastSeen within 60 seconds
    const now = new Date()
    const isOnline = (now.getTime() - session.lastSeen.getTime()) < 60000

    return NextResponse.json({
      isOnline,
      lastSeen: session.lastSeen
    })
  } catch (error) {
    console.error('Get heartbeat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
