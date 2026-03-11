import { db } from '@/lib/db'

export async function logActivity(
  userId: string,
  role: string,
  action: string,
  details: string,
  ipAddress?: string
) {
  try {
    await db.activityLog.create({
      data: { userId, role, action, details, ipAddress: ipAddress ?? null }
    })
  } catch {
    // Non-blocking — never throw from activity logger
  }
}
