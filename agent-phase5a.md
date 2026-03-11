# Agent Task List - Phase 5A: Sourcing, Admin & Notifications (Part 1/3)

> Run this file to complete Phase 5A tasks.

---

## Legend
- ✅ = Already complete (do NOT touch)
- 🔧 = Fix or modify existing code
- ❌ = Missing/needs implementation

---

# PHASE 5: SOURCING, ADMIN & NOTIFICATIONS

---

## P5-01: Sourcing Request Flow (Full)
**Status**: 🔧 PARTIAL - Needs Completion

**File**: `prisma/schema.prisma` - SourcingRequest model exists (lines 314-327)

**Current Implementation**:
- ✅ Basic model exists (sellerId, productName, quantity, status, notes)
- ✅ Four statuses: SUBMITTED, IN_TRANSIT, RECEIVED, STOCKED

**Tasks to Complete**:

1. **Update SourcingRequest model**:
   ```prisma
   model SourcingRequest {
     id              String          @id @default(cuid())
     sellerId        String
     seller          User            @relation(fields: [sellerId], references: [id])
     productName     String
     description     String?
     images          String[]        // Cloudinary URLs
     quantity        Int
     country         String
     shippingMethod  String
     trackingDetails String?
     type            String          @default("INBOUND") // INBOUND | OUTBOUND
     status          SourcingStatus  @default(SUBMITTED)
     adminNote       String?
     receivedQty     Int?
     receivedImages  String[]
     damagedQty      Int?            @default(0)
     createdAt       DateTime        @default(now())
     updatedAt       DateTime        @updatedAt
   }

   enum SourcingStatus {
     SUBMITTED
     IN_TRANSIT
     RECEIVED
     STOCKED
     REJECTED
   }
   ```

2. **Create sourcing pages**:
   - Seller side: Form + list with status
   - Admin side: All requests list, actions (Approve, Reject, In Transit, Receipt)
   - On receipt: enter actual quantity, upload photos, declare damaged units

3. **Run migration**:
   ```bash
   npm run db:push
   ```

---

## P5-02: Cloudinary Image Upload for Sourcing
**Status**: ✅ DONE (already implemented)

**Files**:
- `src/app/api/upload/image/route.ts` - Full Cloudinary upload API exists
- `package.json` - cloudinary (^2.9.0) installed

**Verified Implementation**:
- ✅ Accepts image files (JPEG, PNG, WebP)
- ✅ Validates file size (max 5MB)
- ✅ Uploads to Cloudinary 'gabon-cod/products' folder
- ✅ Returns secure URL and public_id
- ✅ Admin/SELLER role check

**No action needed** - Image upload API is fully functional.

---

## P5-03: Seller Stock Visibility
**Status**: 🔧 PARTIAL - Needs Verification

**Tasks**:

1. **Verify seller dashboard** shows their own stock levels per product.
2. **Verify low stock alerts** visible on seller dashboard.
3. **Verify seller cannot see other sellers' stock**.

---

## P5-04: Daily Stock Snapshot per Product
**Status**: ❌ MISSING

**Tasks**:

1. **Add StockSnapshot model to schema**:
   ```prisma
   model StockSnapshot {
     id              String   @id @default(cuid())
     productId       String
     product         Product  @relation(fields: [productId], references: [id])
     date            DateTime
     initialStock    Int
     inForDelivery   Int
     outForDelivery  Int
     finalStock      Int
   }
   ```

2. **Add relation to Product model**.

3. **Create daily cron job or end-of-day trigger**:
   - Record per product per day: Initial → In for Delivery → Out for Delivery → Final

4. **Add "Daily Report" tab** to stock module showing snapshots.

---

## P5-05: Activity Logs Full Audit Trail
**Status**: ✅ DONE (already implemented)

**Files**:
- `prisma/schema.prisma` - ActivityLog model exists (lines 244-253)
- `src/lib/activity-logger.ts` - Logger function exists

**No action needed** - Full audit trail exists.

---

## P5-06: SMS + WhatsApp Notifications via Twilio
**Status**: ✅ DONE (already implemented)

**Files**:
- `src/app/api/notifications/route.ts` - Full Twilio notification API exists
- `src/lib/notifications.ts` - Notification service exists
- `package.json` - twilio (^5.12.2) installed

**Verified Implementation**:
- ✅ Twilio SDK integrated with SMS and WhatsApp channels
- ✅ French message templates for order status updates
- ✅ Notifications triggered on: CONFIRMED, SHIPPED, DELIVERED, RETURNED
- ✅ Notification logging in NotificationLog model
- ✅ Stats tracking for notifications
- ✅ Background job support (non-blocking)

**No action needed** - Twilio notifications are fully implemented.

---

## P5-07: Real-Time Queue Updates via Pusher
**Status**: ❌ MISSING

**Library needed**: `pusher` and `pusher-js` - `npm install pusher pusher-js`

**Tasks**:

1. **Install Pusher**:
   ```bash
   npm install pusher pusher-js
   ```

2. **Add Pusher config to .env**:
   ```
   PUSHER_APP_ID=your_app_id
   PUSHER_KEY=your_key
   PUSHER_SECRET=your_secret
   PUSHER_CLUSTER=your_cluster
   ```

3. **Create Pusher client** (`src/lib/pusher.ts`):
   ```typescript
   import Pusher from 'pusher'

   export const pusher = new Pusher({
     appId: process.env.PUSHER_APP_ID,
     key: process.env.PUSHER_KEY,
     secret: process.env.PUSHER_SECRET,
     cluster: process.env.PUSHER_CLUSTER,
     useTLS: true
   })
   ```

4. **Broadcast updates** when queue changes:
   - Order status change
   - Assignment change
   - Bundle detected
   - `pusher.trigger('queue-updates', 'order-updated', data)`

5. **Update call center page** to subscribe:
   ```javascript
   const channel = pusher.subscribe('queue-updates')
   channel.bind('order-updated', (data) => {
     // Refresh queue
   })
   ```

6. **Update admin dashboard** notification feed for real-time updates.

---

## P5-08: Seller Sub-Team Management
**Status**: 🔧 PARTIAL - Needs Verification

**Files**:
- `src/app/(dashboard)/seller/team/page.tsx` - Page exists

**Tasks**:

1. **Verify sub-user functionality**:
   - Seller can invite call center agent via email
   - Sub-user role = `CALL_CENTER` only
   - Sub-user scoped to that seller's orders (override unified queue)
   - Seller can deactivate sub-users

2. **Review parentSellerId field** in User model (line 21) - already exists.

3. **Verify team management page** shows list of sub-users with invite/deactivate actions.

---

## Summary of Phase 5A

| Task | Status | Notes |
|------|--------|-------|
| P5-01 - Sourcing request flow | 🔧 Partial | Model exists, need full CRUD pages |
| P5-02 - Cloudinary upload | ✅ Complete | Image API functional |
| P5-03 - Seller stock visibility | 🔧 Partial | Verify stock views + alerts |
| P5-04 - Daily stock snapshot | ❌ Missing | Need StockSnapshot model |
| P5-05 - Activity logs | ✅ Complete | Full audit trail exists |
| P5-06 - SMS/WhatsApp (Twilio) | ✅ Complete | Notification service exists |
| P5-07 - Pusher real-time | ❌ Missing | Need Pusher integration |
| P5-08 - Seller sub-team | 🔧 Partial | Verify sub-user management |

**Total**: 3/8 Complete (37%)

**Remaining Work**:
- P5-01: Complete sourcing request CRUD pages
- P5-03: Verify seller stock views and low stock alerts
- P5-04: Create stock snapshot system (model + cron job + UI)
- P5-07: Install Pusher and integrate real-time updates
- P5-08: Verify seller sub-team invitation functionality

---

## How to run this agent

Open the project in your terminal and run:

```bash
claude "complete Phase 5A tasks from agent-phase5a.md"
```

This agent will verify and complete the Phase 5A tasks listed above.
