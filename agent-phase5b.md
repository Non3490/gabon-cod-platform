# Agent Task List - Phase 5B: Sourcing & Stock (Part 2/3)

> Run this file to complete Phase 5B tasks.

---

## Legend
- ✅ = Already complete (do NOT touch)
- 🔧 = Fix or modify existing code
- ❌ = Missing/needs implementation

---

## P5-01: Sourcing Request Flow (Full)
**Status**: 🔧 PARTIAL - Needs CRUD Pages

**Files**: `prisma/schema.prisma` - SourcingRequest model exists

**Current State**:
- ✅ Basic model exists (sellerId, productName, quantity, status, notes)
- ✅ Four statuses: SUBMITTED, IN_TRANSIT, RECEIVED, STOCKED

**Tasks to Complete**:

1. **Update SourcingRequest model** (add missing fields):
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
   - `src/app/(dashboard)/sourcing/page.tsx` (seller): Form + list with status
   - `src/app/(dashboard)/admin/sourcing/page.tsx` (admin): All requests list, actions

3. **Create sourcing API** (`src/app/api/sourcing/route.ts`):
   ```typescript
   // GET - List sourcing requests (scoped to seller or all for admin)
   // POST - Create new request
   // PATCH - Update status (Approve, Reject, In Transit, Stock)
   // POST /receipt - Record receipt with actual qty + photos
   ```

4. **Run migration**:
   ```bash
   npm run db:push
   ```

---

## P5-03: Seller Stock Visibility
**Status**: ❌ MISSING

**Tasks**:

1. **Create stock dashboard page** (`src/app/(dashboard)/seller/stock/page.tsx`):
   - Show product list with stock levels
   - Show low stock alerts for products below threshold
   - Filter by category or search

2. **Create stock API** (`src/app/api/stock/route.ts`):
   ```typescript
   // GET - List products with stock levels (seller-scoped)
   // GET - Low stock alerts (below threshold)
   // PATCH - Update stock quantity
   ```

3. **Add stock threshold to Product model** if needed.

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

3. **Create daily snapshot cron job** (`src/app/api/cron/snapshot/route.ts`):
   ```typescript
   // Record per product per day at midnight
   // Calculate: initial → in for delivery → out for delivery → final
   ```

4. **Add "Daily Report" tab** to stock module showing snapshots.

---

## Summary of Phase 5B

| Task | Status | Notes |
|------|--------|-------|
| P5-01 - Sourcing request flow | 🔧 Partial | Model exists, need CRUD pages + API |
| P5-03 - Seller stock visibility | ❌ Missing | Need stock dashboard + API |
| P5-04 - Daily stock snapshot | ❌ Missing | Need model + cron job + UI |

**Total**: 0/3 Complete (0%)

**Remaining Work**:
- P5-01: Create sourcing CRUD pages (seller + admin) + API
- P5-03: Create seller stock dashboard with low stock alerts
- P5-04: Create stock snapshot system (model + cron job + daily report UI)

---

## How to run this agent

Open the project in your terminal and run:

```bash
claude "complete Phase 5B tasks from agent-phase5b.md"
```

This agent will verify and complete the Phase 5B tasks listed above.
