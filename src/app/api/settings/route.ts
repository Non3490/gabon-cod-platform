import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

const ALLOWED_KEYS = [
  'webhook_secret_shopify',
  'webhook_secret_youcan',
  'webhook_secret_dropify'
]

// GET /api/settings — returns configured status for all webhook keys (ADMIN only)
export async function GET() {
  const user = await getSession()

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const settings = await db.systemSetting.findMany({
    where: { key: { in: ALLOWED_KEYS } }
  })

  const result: Record<string, { configured: boolean; description: string | null }> = {}

  for (const key of ALLOWED_KEYS) {
    const setting = settings.find((s) => s.key === key)
    result[key] = {
      configured: !!(setting?.value),
      description: setting?.description ?? null
    }
  }

  return NextResponse.json({ settings: result })
}

// PATCH /api/settings — upsert a single webhook secret (ADMIN only)
export async function PATCH(request: NextRequest) {
  const user = await getSession()

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { key, value } = body

  if (!key || !ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 })
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return NextResponse.json({ error: 'Value must be a non-empty string' }, { status: 400 })
  }

  const platformName = key.replace('webhook_secret_', '')

  await db.systemSetting.upsert({
    where: { key },
    update: { value: value.trim() },
    create: {
      key,
      value: value.trim(),
      description: `Webhook secret for ${platformName}`
    }
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/settings — remove a webhook secret (ADMIN only)
export async function DELETE(request: NextRequest) {
  const user = await getSession()

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const key = searchParams.get('key')

  if (!key || !ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 })
  }

  await db.systemSetting.deleteMany({ where: { key } })

  return NextResponse.json({ ok: true })
}
