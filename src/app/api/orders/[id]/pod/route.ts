import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { canAccessOrder } from '@/lib/auth-guard'
import { db } from '@/lib/db'

// POST /api/orders/[id]/pod - Submit proof of delivery (photo URL and/or signature URL)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { podPhotoUrl, podSignatureUrl } = body

    if (!podPhotoUrl && !podSignatureUrl) {
      return NextResponse.json({ error: 'Provide podPhotoUrl or podSignatureUrl' }, { status: 400 })
    }

    const order = await db.order.findUnique({
      where: { id },
      select: { sellerId: true, deliveryManId: true, status: true }
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (!canAccessOrder(user.id, user.role, order, user.parentSellerId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (podPhotoUrl) updateData.podPhotoUrl = podPhotoUrl
    if (podSignatureUrl) updateData.podSignatureUrl = podSignatureUrl

    // Auto-advance to DELIVERED if status is SHIPPED
    if (order.status === 'SHIPPED') {
      updateData.status = 'DELIVERED'
      updateData.deliveredAt = new Date()
    }

    const updated = await db.order.update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.status === 'DELIVERED' ? {
          history: {
            create: {
              previousStatus: order.status,
              newStatus: 'DELIVERED',
              changedById: user.id,
              note: 'Delivered with POD'
            }
          }
        } : {})
      },
      select: {
        id: true,
        status: true,
        podPhotoUrl: true,
        podSignatureUrl: true,
        deliveredAt: true
      }
    })

    return NextResponse.json({ order: updated })
  } catch (error) {
    console.error('POD POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
