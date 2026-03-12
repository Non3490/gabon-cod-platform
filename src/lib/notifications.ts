import { db } from '@/lib/db'
import twilio from 'twilio'

const twilioClient = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

// French message templates
const messageTemplates: Record<string, (order: any) => string> = {
  ORDER_CONFIRMED: (order) =>
    `Bonjour ${order.recipientName}, votre commande #${order.trackingNumber} a été confirmée. Vous serez livré sous 2-3 jours ouvrables.`,
  ORDER_SHIPPED: (order) =>
    `Bonjour ${order.recipientName}, votre commande #${order.trackingNumber} est en route. Numéro de suivi: ${order.awbTrackingCode || 'Non disponible'}. Préparez ${order.codAmount} MAD.`,
  ORDER_DELIVERED: (order) =>
    `Bonjour ${order.recipientName}, votre commande #${order.trackingNumber} a été livrée avec succès. Merci de votre confiance!`,
  ORDER_RETURNED: (order) =>
    `Bonjour ${order.recipientName}, votre commande #${order.trackingNumber} n'a pas pu être livrée. Nous vous recontacterons.`
}

/**
 * Send notification (SMS or WhatsApp) for an order
 * @param order - The order object
 * @param type - Notification type
 * @returns Promise that resolves when notification is sent
 */
export async function sendNotification(order: any, type: string, channel: 'SMS' | 'WHATSAPP' = 'SMS') {
  const template = messageTemplates[type]
  if (!template) {
    console.warn(`No template found for notification type: ${type}`)
    return null
  }

  const message = template(order)

  if (!message) {
    return null
  }

  try {
    let result

    if (channel === 'WHATSAPP' && process.env.TWILIO_WHATSAPP_FROM) {
      // Send WhatsApp message
      result = await twilioClient.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
        to: order.phone.startsWith('+') ? order.phone : `+212${order.phone}`, // Morocco country code
        body: message
      })
    } else {
      // Send SMS message
      result = await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: order.phone.startsWith('+') ? order.phone : `+212${order.phone}`,
        body: message
      })
    }

    // Log notification to database
    await db.notificationLog.create({
      data: {
        orderId: order.id,
        type: type as any,
        channel: channel as any,
        phone: order.phone,
        message,
        status: 'sent'
      }
    })

    return { success: true, sid: result.sid }
  } catch (error: any) {
    console.error(`Failed to send ${type} notification:`, error)

    // Log failed notification
    try {
      await db.notificationLog.create({
        data: {
          orderId: order.id,
          type: type as any,
          channel: channel as any,
          phone: order.phone,
          message: messageTemplates[type]?.(order) || '',
          status: 'failed'
        }
      })
    } catch (logError) {
      console.error('Failed to log notification:', logError)
    }

    return { success: false, error: error.message }
  }
}

/**
 * Send SMS/WhatsApp notification for multiple orders
 * @param orders - Array of orders
 * @param type - Notification type
 * @param channel - SMS or WhatsApp
 */
export async function sendBulkNotifications(
  orders: any[],
  type: string,
  channel: 'SMS' | 'WHATSAPP' = 'SMS'
) {
  const results = await Promise.all(
    orders.map(order => sendNotification(order, type, channel))
  )

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return {
    total: orders.length,
    successful,
    failed,
    results
  }
}

/**
 * Get notification logs for an order
 */
export async function getOrderNotifications(orderId: string) {
  const logs = await db.notificationLog.findMany({
    where: { orderId },
    orderBy: { sentAt: 'desc' }
  })

  return logs
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(since?: Date) {
  const where: any = {}
  if (since) {
    where.sentAt = { gte: since }
  }

  const logs = await db.notificationLog.findMany({
    where,
    orderBy: { sentAt: 'desc' }
  })

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
    byType: {} as Record<string, number>,
    byChannel: {} as Record<string, number>
  }

  // Group by type
  for (const log of logs) {
    stats.byType[log.type] = (stats.byType[log.type] || 0) + 1
    stats.byChannel[log.channel] = (stats.byChannel[log.channel] || 0) + 1
  }

  return stats
}
