import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const integrations = await db.integration.findMany({
      where: user.role === 'ADMIN' ? {} : { sellerId: user.id },
      include: { seller: { select: { name: true, email: true } } }
    })

    return NextResponse.json({ integrations })
  } catch (error) {
    console.error('Integrations GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { platform, secret, sellerId } = body
    const targetSellerId = (user.role === 'ADMIN' && sellerId) ? sellerId : user.id

    if (!platform || !secret) {
      return NextResponse.json({ error: 'Missing platform or secret' }, { status: 400 })
    }

    const integration = await db.integration.upsert({
      where: { sellerId_platform: { sellerId: targetSellerId, platform } },
      create: { sellerId: targetSellerId, platform, secret, isActive: true },
      update: { secret, isActive: true }
    })

    return NextResponse.json({ integration })
  } catch (error) {
    console.error('Integrations POST error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    const integration = await db.integration.findUnique({ where: { id } })
    if (!integration) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (user.role !== 'ADMIN' && integration.sellerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.integration.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Integrations DELETE error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
