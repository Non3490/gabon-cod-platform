import { NextRequest, NextResponse } from 'next/server'
import { createDailySnapshots } from '@/lib/stock-snapshot'

// GET /api/cron/snapshot - Generate daily stock snapshots
// This endpoint is called by a cron job to generate daily snapshots
export async function GET(request: NextRequest) {
  try {
    // Simple auth check for cron triggers (use CRON_SECRET env var)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-cron-secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await createDailySnapshots()

    return NextResponse.json({
      ...result,
      message: `Created or updated ${result.count} stock snapshots for ${new Date().toLocaleDateString()}`
    })
  } catch (error) {
    console.error('Cron snapshot error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
