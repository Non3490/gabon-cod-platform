import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'

// PATCH /api/sourcing/[id] — admin manages sourcing request workflow
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { id } = await params
    const { status, adminNote, trackingDetails, receivedQty, receivedImages, damagedQty } = await request.json()

    const validStatuses = ['SUBMITTED', 'IN_TRANSIT', 'RECEIVED', 'STOCKED', 'REJECTED']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get current request for status tracking
    const current = await db.sourcingRequest.findUnique({ where: { id } })
    if (!current) {
      return NextResponse.json({ error: 'Sourcing request not found' }, { status: 404 })
    }

    // Build update data based on new status
    const updateData: any = {}
    if (status) updateData.status = status
    if (adminNote !== undefined) updateData.adminNote = adminNote || null
    if (trackingDetails !== undefined) updateData.trackingDetails = trackingDetails || null
    if (receivedQty !== undefined) updateData.receivedQty = receivedQty || null
    if (damagedQty !== undefined) updateData.damagedQty = damagedQty || 0
    if (receivedImages !== undefined) updateData.receivedImages = receivedImages && receivedImages.length > 0 ? JSON.stringify(receivedImages) : '[]'

    // Track timestamps based on status changes
    if (status === 'IN_TRANSIT' && current.status !== 'IN_TRANSIT') {
      updateData.inTransitAt = new Date()
    }
    if (status === 'RECEIVED' && current.status !== 'RECEIVED') {
      updateData.receivedAt = new Date()
    }
    if (status === 'STOCKED' && current.status !== 'STOCKED') {
      updateData.stockedAt = new Date()
    }
    if (status && ['IN_TRANSIT', 'RECEIVED', 'STOCKED', 'REJECTED'].includes(status) && !current.reviewedAt) {
      updateData.reviewedAt = new Date()
      updateData.reviewedBy = user.id
    }

    const updated = await db.sourcingRequest.update({
      where: { id },
      data: updateData
    })

    // Log activity
    if (status) {
      logActivity(user.id, user.role, 'SOURCING_REQUEST_UPDATED', `${status} — ${current.productName} (${id})`).catch(() => {})
    }

    // Parse images for response
    const responseData = {
      ...updated,
      images: updated.images ? JSON.parse(updated.images) : [],
      receivedImages: updated.receivedImages ? JSON.parse(updated.receivedImages) : []
    }

    return NextResponse.json({ request: responseData })
  } catch (error) {
    console.error('Sourcing PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
