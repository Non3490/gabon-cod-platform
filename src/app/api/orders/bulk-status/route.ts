import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'

/**
 * POST /api/orders/bulk-status
 * Update status for multiple orders at once
 */
export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { orderIds, newStatus, note } = body

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'orderIds is required and must be a non-empty array' }, { status: 400 })
    }

    if (!newStatus) {
      return NextResponse.json({ error: 'newStatus is required' }, { status: 400 })
    }

    // Valid order statuses
    const validStatuses = [
      'NEW', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURNED',
      'CANCELLED', 'POSTPONED', 'NO_ANSWER', 'BUSY', 'CALLBACK',
      'UNREACHED', 'WRONG_NUMBER', 'DOUBLE', 'RETURN_TO_STOCK'
    ]

    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
    }

    // Process orders in a transaction
    const results = await db.$transaction(async (tx) => {
      const results = []

      for (const orderId of orderIds) {
        try {
          // Get current order
          const order = await tx.order.findUnique({
            where: { id: orderId }
          })

          if (!order) {
            results.push({ orderId, success: false, error: 'Order not found' })
            continue
          }

          // Skip if already has the target status
          if (order.status === newStatus) {
            results.push({ orderId, success: true, skipped: true })
            continue
          }

          // Update order
          await tx.order.update({
            where: { id: orderId },
            data: {
              status: newStatus,
              // Update timestamp fields based on status
              ...(newStatus === 'CONFIRMED' && { confirmedAt: new Date() }),
              ...(newStatus === 'SHIPPED' && { shippedAt: new Date() }),
              ...(newStatus === 'DELIVERED' && { deliveredAt: new Date() }),
              ...(newStatus === 'RETURNED' && { returnedAt: new Date() }),
              ...(newStatus === 'CANCELLED' && { cancelledAt: new Date() })
            }
          })

          // Create order history entry
          await tx.orderHistory.create({
            data: {
              orderId,
              previousStatus: order.status,
              newStatus,
              changedById: user.id,
              note
            }
          })

          results.push({ orderId, success: true, previousStatus: order.status })
        } catch (error) {
          console.error(`Failed to update order ${orderId}:`, error)
          results.push({ orderId, success: false, error: 'Update failed' })
        }
      }

      return results
    })

    // Count successes and failures
    const successCount = results.filter(r => r.success && !r.skipped).length
    const skippedCount = results.filter(r => r.skipped).length
    const failureCount = results.filter(r => !r.success).length

    // Log activity
    await logActivity(
      user.id,
      user.role,
      'BULK_STATUS_UPDATE',
      `Bulk updated ${successCount} orders to ${newStatus}. ${skippedCount} skipped, ${failureCount} failed.`
    )

    return NextResponse.json({
      results,
      summary: {
        total: orderIds.length,
        success: successCount,
        skipped: skippedCount,
        failed: failureCount
      }
    })
  } catch (error) {
    console.error('Bulk status update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
