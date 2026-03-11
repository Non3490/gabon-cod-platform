# Backend Tasks - Gabon COD Platform

> Run this file to complete all backend/infrastructure-related tasks.

## Overview
These tasks focus on database models, APIs, integrations, and background jobs.

---

## Task 1: Daily Stock Snapshot System

**Status**: ❌ MISSING - New model + cron job needed

### 1.1: Update Database Schema

**File**: `prisma/schema.prisma`

Add the following model:

```prisma
model StockSnapshot {
  id              String   @id @default(cuid())
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  date            DateTime @default(now())
  initialStock    Int
  inForDelivery   Int      @default(0)
  outForDelivery  Int      @default(0)
  finalStock      Int
  snapshotDate    DateTime @default(now())

  @@unique([productId, snapshotDate])
  @@index([productId])
  @@index([snapshotDate])
}
```

**Add relation to Product model**:
```prisma
model Product {
  // ... existing fields
  stockSnapshots StockSnapshot[]
}
```

### 1.2: Run Migration

```bash
npx prisma db push
```

### 1.3: Create Snapshot API

**File**: `src/app/api/stock/snapshots/route.ts`

Create GET endpoint:
- Query params: `productId`, `startDate`, `endDate`
- Return stock snapshots for date range
- Include product details

### 1.4: Create Daily Snapshot Cron Job

**File**: `src/lib/stock-snapshot.ts`

Create snapshot service:

```typescript
import { prisma } from '@/lib/db'

export async function createDailySnapshots() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get all products
  const products = await prisma.product.findMany({
    include: {
      orders: {
        where: {
          createdAt: {
            gte: new Date(today.getTime() - 24 * 60 * 60 * 1000),
            lt: today,
          },
        },
      },
    },
  })

  for (const product of products) {
    const initialStock = product.quantity
    const inForDelivery = product.orders.filter(
      o => o.status === 'SHIPPED' && !o.isReturned
    ).length
    const outForDelivery = product.orders.filter(
      o => o.status === 'DELIVERED' || (o.status === 'RETURNED' && o.isReturned)
    ).length
    const finalStock = initialStock - inForDelivery + outForDelivery

    await prisma.stockSnapshot.create({
      data: {
        productId: product.id,
        date: today,
        initialStock,
        inForDelivery,
        outForDelivery,
        finalStock,
      },
    })
  }

  return { success: true, count: products.length }
}
```

### 1.5: Create API Route for Manual Trigger

**File**: `src/app/api/stock/snapshot-trigger/route.ts`

```typescript
import { createDailySnapshots } from '@/lib/stock-snapshot'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (req, user) => {
  if (user.role !== 'ADMIN') {
    return new Response('Unauthorized', { status: 401 })
  }

  const result = await createDailySnapshots()
  return Response.json(result)
})
```

### 1.6: Setup Cron Job (Vercel Cron)

**File**: `api/stock/snapshot-cron/route.ts`

```typescript
import { createDailySnapshots } from '@/lib/stock-snapshot'

export const config = {
  runtime: 'nodejs',
}

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const result = await createDailySnapshots()
  res.json(result)
}
```

**Add to vercel.json**:
```json
{
  "crons": [{
    "path": "/api/stock/snapshot-cron",
    "schedule": "0 0 * * *"
  }]
}
```

### 1.7: Add Daily Report UI

**File**: `src/app/(dashboard)/admin/stock/snapshots/page.tsx`

Create page with:
- Date range picker
- Table showing all snapshots for selected period
- Export to CSV button
- Charts: Initial → In Delivery → Out Delivery → Final flow

---

## Task 2: Pusher Real-Time Updates

**Status**: ❌ MISSING - Needs package + integration

### 2.1: Install Dependencies

```bash
npm install pusher pusher-js
```

### 2.2: Update Environment Variables

Add to `.env` and `.env.example`:

```env
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster
```

### 2.3: Create Pusher Client

**File**: `src/lib/pusher.ts`

```typescript
import Pusher from 'pusher'

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})
```

### 2.4: Create Pusher Hook

**File**: `src/hooks/usePusher.ts`

```typescript
import { useEffect, useState } from 'react'
import Pusher from 'pusher-js'

interface UsePusherOptions {
  channelName: string
  eventName: string
}

export function usePusher({ channelName, eventName }: UsePusherOptions) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    const channel = pusher.subscribe(channelName)
    channel.bind(eventName, (newData: any) => {
      setData(newData)
    })

    return () => {
      channel.unbind(eventName)
      channel.unsubscribe()
      pusher.disconnect()
    }
  }, [channelName, eventName])

  return data
}
```

### 2.5: Broadcast Queue Updates

Update `src/app/api/orders/[id]/route.ts` to broadcast changes:

```typescript
import { pusher } from '@/lib/pusher'

// After order status change:
await pusher.trigger('queue-updates', 'order-updated', {
  orderId: order.id,
  status: order.status,
  sellerId: order.sellerId,
})
```

Update `src/app/api/orders/bundle/route.ts`:

```typescript
import { pusher } from '@/lib/pusher'

// After bundle confirm:
await pusher.trigger('queue-updates', 'bundle-confirmed', {
  bundleId,
  orderCount: orders.length,
})
```

### 2.6: Subscribe to Updates in Call Center

Update `src/app/(dashboard)/call-center/page.tsx`:

```typescript
import { usePusher } from '@/hooks/usePusher'

// Add hook:
const update = usePusher({
  channelName: 'queue-updates',
  eventName: 'order-updated',
})

// Add effect to refresh queue:
useEffect(() => {
  if (update) {
    fetchQueue() // Refresh queue data
  }
}, [update])
```

### 2.7: Add Real-Time Activity Feed to Admin Dashboard

Update `src/app/(dashboard)/admin/page.tsx`:

```typescript
import { usePusher } from '@/hooks/usePusher'

// Add hook:
const activityUpdate = usePusher({
  channelName: 'activity-updates',
  eventName: 'new-activity',
})

// Broadcast activity in actions:
await pusher.trigger('activity-updates', 'new-activity', {
  type: 'ORDER_STATUS_CHANGED',
  description: `Order #${order.code} updated to ${status}`,
  timestamp: new Date().toISOString(),
})
```

### 2.8: Create Pusher Settings Page

**File**: `src/app/(dashboard)/admin/settings/pusher/page.tsx`

Create page with:
- Pusher App ID input
- Pusher Key input
- Pusher Secret input (masked)
- Pusher Cluster dropdown
- Test Connection button
- Save button

---

## Task 3: Verify and Extend Sourcing API

**Status**: ⚠️ PARTIAL - Model exists, API routes needed

### 3.1: Create Sourcing Request API

**File**: `src/app/api/sourcing/route.ts`

```typescript
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (req, user) => {
  const sourcing = await prisma.sourcingRequest.findMany({
    where: user.role === 'SELLER'
      ? { sellerId: user.id }
      : undefined,
    include: { seller: true },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(sourcing)
})

export const POST = withAuth(async (req, user) => {
  if (user.role !== 'SELLER') {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json()
  const sourcing = await prisma.sourcingRequest.create({
    data: {
      sellerId: user.id,
      ...body,
    },
  })
  return Response.json(sourcing)
})
```

### 3.2: Create Sourcing Update API

**File**: `src/app/api/sourcing/[id]/route.ts`

```typescript
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth'

export const PATCH = withAuth(async (req, user) => {
  if (user.role !== 'ADMIN') {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = req.params
  const body = await req.json()

  const updated = await prisma.sourcingRequest.update({
    where: { id },
    data: body,
  })
  return Response.json(updated)
})
```

### 3.3: Create Receipt API

**File**: `src/app/api/sourcing/[id]/receipt/route.ts`

```typescript
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth'

export const POST = withAuth(async (req, user) => {
  if (user.role !== 'ADMIN') {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = req.params
  const body = await req.json()

  // Update product stock
  const sourcing = await prisma.sourcingRequest.findUnique({
    where: { id },
    include: { product: true },
  })

  if (sourcing?.product) {
    const actualReceived = body.receivedQty - body.damagedQty
    await prisma.product.update({
      where: { id: sourcing.productId },
      data: {
        quantity: { increment: actualReceived },
      },
    })
  }

  // Update sourcing request
  const updated = await prisma.sourcingRequest.update({
    where: { id },
    data: {
      status: 'RECEIVED',
      receivedQty: body.receivedQty,
      receivedImages: body.receivedImages,
      damagedQty: body.damagedQty,
    },
  })

  return Response.json(updated)
})
```

---

## Task 4: Verify Expense API for Call Center

**Status**: ✅ DONE - Just verify it's working

**File**: `src/app/api/expenses/route.ts`

Verify:
- GET returns agent expenses when role = CALL_CENTER
- POST creates expense with agentId automatically
- All expense categories work (Internet, Call Minutes, Transportation, Other)

---

## Summary

| Task | Priority | Est. Time |
|------|----------|-----------|
| Task 1: Daily Stock Snapshot | High | 4-5 hrs |
| Task 2: Pusher Real-Time | High | 3-4 hrs |
| Task 3: Sourcing API | Medium | 2-3 hrs |
| Task 4: Verify Expenses | Low | 0.5 hr |

**Total Estimated Time: 9-12 hours**

---

## Dependencies

- Task 2 (Pusher) requires environment variables before implementation
- Task 3 (Sourcing API) should be done before Task 2 (Frontend pages)
- Task 1 (Stock Snapshot) is independent

---

## Testing Checklist

After completing all tasks:

### Stock Snapshot
- [ ] Migration runs successfully
- [ ] StockSnapshot model created
- [ ] Daily snapshot cron job runs
- [ ] Snapshots display correctly
- [ ] Stock calculations are accurate
- [ ] Daily report UI shows data
- [ ] CSV export works

### Pusher Real-Time
- [ ] Pusher client connects
- [ ] Order updates broadcast correctly
- [ ] Call center page refreshes on updates
- [ ] Activity feed updates in real-time
- [ ] Multiple users receive updates
- [ ] Settings page saves configuration

### Sourcing API
- [ ] Seller can create sourcing request
- [ ] GET returns scoped requests
- [ ] Admin can update request status
- [ ] Receipt API updates product stock
- [ ] Damaged quantity tracked correctly

---

**Created for agent execution**
