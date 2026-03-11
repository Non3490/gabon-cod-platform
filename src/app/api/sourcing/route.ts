import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'

// GET /api/sourcing — seller: own requests; admin: all
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const where = user.role === 'ADMIN' ? {} : { sellerId: user.id }

    const requests = await db.sourcingRequest.findMany({
      where,
      include: { seller: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    })

    // Parse JSON arrays for frontend
    const parsedRequests = requests.map(req => ({
      ...req,
      images: req.images ? JSON.parse(req.images) : [],
      receivedImages: req.receivedImages ? JSON.parse(req.receivedImages) : []
    }))

    return NextResponse.json({ requests: parsedRequests })
  } catch (error) {
    console.error('Sourcing GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sourcing — seller submits sourcing request
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user || user.role !== 'SELLER') {
      return NextResponse.json({ error: 'Only sellers can create sourcing requests' }, { status: 403 })
    }

    const body = await request.json()
    const { productName, description, referenceUrl, images, quantity, country, shippingMethod, type } = body

    if (!productName) return NextResponse.json({ error: 'productName is required' }, { status: 400 })
    if (!quantity || quantity < 1) return NextResponse.json({ error: 'quantity must be at least 1' }, { status: 400 })
    if (!country) return NextResponse.json({ error: 'country is required' }, { status: 400 })
    if (!shippingMethod) return NextResponse.json({ error: 'shippingMethod is required' }, { status: 400 })

    const req = await db.sourcingRequest.create({
      data: {
        sellerId: user.id,
        productName,
        description: description || null,
        referenceUrl: referenceUrl || null,
        images: images && images.length > 0 ? JSON.stringify(images) : '[]',
        quantity: parseInt(quantity),
        country,
        shippingMethod,
        type: type || 'INBOUND'
      }
    })

    logActivity(user.id, user.role, 'SOURCING_REQUEST_CREATED', `${productName} (${quantity} units from ${country})`).catch(() => {})

    return NextResponse.json({ request: { ...req, images: req.images ? JSON.parse(req.images) : [] } }, { status: 201 })
  } catch (error) {
    console.error('Sourcing POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
