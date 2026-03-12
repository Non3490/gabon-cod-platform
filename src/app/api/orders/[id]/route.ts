import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { canAccessOrder } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { creditWallet } from '@/lib/wallet-service'
import { logActivity } from '@/lib/activity-logger'
import { syncOrderStatusToConnectedSheets } from '@/lib/sheets-sync-helper'
import { broadcastOrderUpdate, QUEUE_EVENTS } from '@/lib/pusher'
import { runAutoFlagCheckAfterOrderUpdate } from '@/lib/blacklist-service'

// GET /api/orders/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, email: true, role: true, phone: true } },
        deliveryMan: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, costPrice: true, sellPrice: true } } } },
        history: { orderBy: { createdAt: 'desc' } },
        callLogs: {
          include: { agent: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (!canAccessOrder(user.id, user.role, order, user.parentSellerId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Backward-compat aliases for existing UI pages
    // Strip cost/margin fields for CALL_CENTER role
    const responseOrder: Record<string, unknown> = {
      ...order,
      customerName: order.recipientName,
      customerPhone: order.phone,
      customerAddress: order.address,
      notes: order.note,
      callLogs: order.callLogs.map(log => ({ ...log, status: log.attempt, notes: log.comment })),
      history: order.history.map(h => ({ ...h, oldStatus: h.previousStatus, notes: h.note }))
    }

    if (user.role === 'CALL_CENTER') {
      // Remove sensitive financial fields
      delete responseOrder.productCost
      delete responseOrder.shippingCost
      delete responseOrder.callCenterFee
      delete responseOrder.adSpend
      // Also strip from items if they exist
      if (responseOrder.items && Array.isArray(responseOrder.items)) {
        responseOrder.items = (responseOrder.items as any[]).map((item: any) => {
          const { costPrice, ...safeItem } = item
          return safeItem
        })
      }
    }

    return NextResponse.json({ order: responseOrder })
  } catch (error) {
    console.error('Get order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/orders/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { status, note, deliveryManId } = body

    const existing = await db.order.findUnique({
      where: { id },
      select: { status: true, sellerId: true, deliveryManId: true }
    })

    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (!canAccessOrder(user.id, user.role, { sellerId: existing.sellerId, deliveryManId: existing.deliveryManId }, user.parentSellerId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}

    if (status && status !== existing.status) {
      updateData.status = status
      if (status === 'CONFIRMED') updateData.confirmedAt = new Date()
      if (status === 'SHIPPED') updateData.shippedAt = new Date()
      if (status === 'DELIVERED') updateData.deliveredAt = new Date()
      if (status === 'RETURNED') updateData.returnedAt = new Date()
      if (status === 'CANCELLED') updateData.cancelledAt = new Date()

      // Smart Recall - Auto-reschedule on NO_ANSWER
      if (status === 'NO_ANSWER') {
        const now = new Date()
        // Gabon time is UTC+1, so 9AM = UTC 8:00, 2PM = UTC 13:00
        const gabonTime = new Date(now.getTime() + 60 * 60 * 1000) // UTC+1
        const hours = gabonTime.getUTCHours()
        let scheduledTime: Date

        if (hours < 8) {
          // Before 9 AM → set to today 9 AM
          scheduledTime = new Date(now)
          scheduledTime.setUTCHours(8, 0, 0, 0)
        } else if (hours >= 9 && hours < 14) {
          // Between 9 AM and 2 PM → set to today 2 PM
          scheduledTime = new Date(now)
          scheduledTime.setUTCHours(13, 0, 0, 0)
        } else {
          // After 2 PM → set to tomorrow 9 AM
          scheduledTime = new Date(now)
          scheduledTime.setUTCDate(scheduledTime.getUTCDate() + 1)
          scheduledTime.setUTCHours(8, 0, 0, 0)
        }

        updateData.scheduledCallAt = scheduledTime
      }
    }

    if (note !== undefined) updateData.note = note
    if (deliveryManId !== undefined && user.role === 'ADMIN') updateData.deliveryManId = deliveryManId

    const order = await db.order.update({
      where: { id },
      data: {
        ...updateData,
        history: status && status !== existing.status ? {
          create: {
            previousStatus: existing.status,
            newStatus: status,
            note: note,
            changedById: user.id
          }
        } : undefined
      },
      include: {
        seller: { select: { id: true, name: true } },
        deliveryMan: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        history: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    })

    // Auto stock deduction when shipped, restoration when returned or returned to stock
    if (status && status !== existing.status) {
      if (status === 'SHIPPED' || status === 'RETURNED' || status === 'RETURN_TO_STOCK') {
        const orderWithItems = await db.order.findUnique({
          where: { id },
          select: { trackingNumber: true, items: { select: { productId: true, quantity: true } } }
        })
        if (orderWithItems) {
          for (const item of orderWithItems.items) {
            const stock = await db.stock.findFirst({ where: { productId: item.productId } })
            if (stock) {
              const delta = status === 'SHIPPED' ? -item.quantity : item.quantity
              await db.stock.update({
                where: { id: stock.id },
                data: { quantity: { increment: delta } }
              })
              await db.stockMovement.create({
                data: {
                  stockId: stock.id,
                  type: status === 'SHIPPED' ? 'OUT' : 'IN',
                  quantity: item.quantity,
                  reason: status === 'SHIPPED'
                    ? `Order shipped: ${orderWithItems.trackingNumber}`
                    : `Order returned: ${orderWithItems.trackingNumber}`
                }
              })
            }
          }
        }
      }
    }

    // Credit seller wallet when order is delivered (minus platform fee and bundle delivery share)
    if (status === 'DELIVERED' && status !== existing.status) {
      const fullOrder = await db.order.findUnique({ where: { id }, select: { codAmount: true, platformFee: true, sellerId: true, deliveryManId: true, bundleDeliveryShare: true } })
      if (fullOrder) {
        const deliveryFee = fullOrder.bundleDeliveryShare ?? 0
        const netAmount = fullOrder.codAmount - fullOrder.platformFee - deliveryFee
        const feeDescription = `COD collected — order ${id} (platform fee -${fullOrder.platformFee}, delivery fee -${deliveryFee.toFixed(0)})`
        creditWallet(fullOrder.sellerId, netAmount, feeDescription, id).catch(() => {})

        // Create delivery fee expense for delivery man
        if (fullOrder.deliveryManId) {
          let feeAmount = deliveryFee
          // If not part of a bundle, use delivery fee config
          if (!fullOrder.bundleDeliveryShare) {
            const deliveryFeeConfig = await db.deliveryFeeConfig.findUnique({
              where: { deliveryManId: fullOrder.deliveryManId }
            })
            feeAmount = deliveryFeeConfig?.costPerDelivery ?? 0
          }

          if (feeAmount > 0) {
            await db.expense.create({
              data: {
                category: 'DELIVERY_FEE',
                amount: feeAmount,
                description: `Delivery fee for order ${existing.trackingNumber}${fullOrder.bundleDeliveryShare ? ' (bundle share)' : ''}`,
                agentId: fullOrder.deliveryManId,
                orderId: id
              }
            })
          }
        }
      }
    }

    logActivity(user.id, user.role, 'ORDER_STATUS_UPDATE', `Order ${id}: ${existing.status} → ${status ?? existing.status}`).catch(() => {})

    // Auto-flag customer if they meet blacklist criteria
    if (status && status !== existing.status && (status === 'CONFIRMED' || status === 'DELIVERED' || status === 'RETURNED')) {
      runAutoFlagCheckAfterOrderUpdate(order.phone).catch(err => {
        console.error('Failed to run auto-flag check:', err)
      })
    }

    // Auto-sync order status to Google Sheets (write-back)
    if (status && status !== existing.status) {
      syncOrderStatusToConnectedSheets(existing.sellerId, order.trackingNumber, status).catch(err => {
        console.error('Failed to sync to Google Sheets:', err)
      })

      // Broadcast real-time queue update via Pusher
      broadcastOrderUpdate(QUEUE_EVENTS.ORDER_UPDATED, {
        orderId: order.id,
        trackingNumber: order.trackingNumber,
        status: order.status,
        sellerId: order.sellerId,
        timestamp: new Date().toISOString()
      }).catch(err => {
        console.error('Failed to broadcast order update:', err)
      })
    }

    // Broadcast delivery man assignment change
    if (deliveryManId !== undefined && user.role === 'ADMIN') {
      broadcastOrderUpdate(QUEUE_EVENTS.ORDER_ASSIGNED, {
        orderId: order.id,
        trackingNumber: order.trackingNumber,
        timestamp: new Date().toISOString()
      }).catch(err => {
        console.error('Failed to broadcast assignment:', err)
      })
    }

    // Strip cost-related fields for CALL_CENTER role
    const responseOrder: Record<string, unknown> = { ...order }
    if (user.role === 'CALL_CENTER') {
      delete responseOrder.productCost
      delete responseOrder.shippingCost
      delete responseOrder.callCenterFee
      delete responseOrder.adSpend
    }

    return NextResponse.json({ order: responseOrder })
  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/orders/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { id } = await params

    // onDelete: Cascade handles history and callLogs — but expenses need manual check
    await db.order.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
