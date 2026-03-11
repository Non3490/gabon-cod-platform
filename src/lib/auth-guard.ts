import { Prisma } from '@prisma/client'

/**
 * Returns a Prisma OrderWhereInput that scopes results by the caller's role.
 * - ADMIN: sees all orders
 * - SELLER: sees only their own orders (sellerId)
 * - CALL_CENTER: scoped to their parent seller if parentSellerId is set, else all
 * - DELIVERY: sees only orders assigned to them (deliveryManId)
 */
export function scopeByRole(
  userId: string,
  role: string,
  parentSellerId?: string | null
): Prisma.OrderWhereInput {
  switch (role) {
    case 'ADMIN':
      return {}
    case 'SELLER':
      return { sellerId: userId }
    case 'CALL_CENTER':
      return parentSellerId ? { sellerId: parentSellerId } : {}
    case 'DELIVERY':
      return { deliveryManId: userId }
    default:
      return { id: 'none' } // No access
  }
}

/**
 * Checks if a user can access a specific order.
 */
export function canAccessOrder(
  userId: string,
  role: string,
  order: { sellerId: string; deliveryManId?: string | null },
  parentSellerId?: string | null
): boolean {
  if (role === 'ADMIN') return true
  if (role === 'SELLER') return order.sellerId === userId
  if (role === 'CALL_CENTER') return parentSellerId ? order.sellerId === parentSellerId : true
  if (role === 'DELIVERY') return order.deliveryManId === userId
  return false
}
