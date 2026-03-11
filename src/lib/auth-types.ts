// Types and constants that can be used in both client and server components

export type UserRole = 'ADMIN' | 'SELLER' | 'CALL_CENTER' | 'DELIVERY'

export const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  SELLER: 'Seller',
  CALL_CENTER: 'Call Center Agent',
  DELIVERY: 'Delivery Agent'
}

export const roleColors: Record<UserRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  SELLER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  CALL_CENTER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  DELIVERY: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
}
