# Agent Task List - Phase 3, 4, 5: New Modules, Finance & Analytics, Sourcing & Notifications

> Run this file to complete Phases 3, 4, and 5 tasks.

## Legend
- ✅ = Already complete (do NOT touch)
- 🔧 = Fix or modify existing code
- ❌ = Missing/needs implementation

---

# PHASE 3: NEW MODULES

---

## P3-01: Customer Blacklist Engine (Auto-Flag Logic)
**Status**: ✅ DONE (already implemented)

**Files**:
- `prisma/schema.prisma` - Blacklist model exists (lines 53-62)

**No action needed** - Full Blacklist model exists with all required fields.

---

## P3-02: Blacklist Admin Page
**Status**: ✅ DONE (already implemented)

**File**: `src/app/(dashboard)/admin/blacklist/page.tsx`

**No action needed** - Full CRUD admin page exists.

---

## P3-03: Smart Excel Import Template
**Status**: ✅ DONE (already implemented)

**Files**:
- `src/app/api/orders/template/route.ts` - Full ExcelJS template generation exists
- `package.json` - ExcelJS installed (line 61)

**Verified Implementation**:
- ✅ Uses ExcelJS library
- ✅ Generates properly formatted Excel template with:
  - Row 1: Title "Gabon COD Platform — Order Import Template"
  - Row 2: Instructions
  - Row 3: Headers (TrackingNumber, CustomerName, Phone, Address, City, ProductName, Quantity, CODAmount, Notes)
  - Row 4-5: Sample data rows
  - Row 6: Empty separator
  - Row 7: Validation rules
- ✅ Returns downloadable `.xlsx` file
- ✅ Column widths properly set

**No action needed** - Template API is fully functional.

---

## P3-04: LightFunnels Webhook Integration
**Status**: ✅ DONE (already implemented)

**Files**:
- `src/app/api/webhooks/lightfunnels/route.ts`
- `src/lib/webhook-mappers.ts` - LightFunnels mapper exists

**No action needed** - Full webhook implementation with HMAC verification.

---

## P3-05: Google Sheets 2-Way Sync (Write-Back)
**Status**: ✅ DONE (already implemented)

**Files**:
- `src/app/api/google-sheets/route.ts` - Full sync API exists
- `src/lib/sheets-sync-helper.ts` - Write-back logic exists

**No action needed** - Google Sheets write-back is fully functional.

---

## P3-06: Waze Navigation Button
**Status**: ✅ DONE (already implemented)

**File**: `src/app/(dashboard)/delivery/page.tsx`

**No action needed** - Waze button fully implemented (lines 142-145).

---

## P3-07: Delivery Zone Management
**Status**: ✅ DONE (already implemented)

**Files**:
- `prisma/schema.prisma` - Zone model exists (lines 251-285)
- `src/app/api/zones/route.ts` - Full CRUD API exists

**No action needed** - Full zone management with:
- ✅ GET list zones
- ✅ POST create zone
- ✅ PUT update zone
- ✅ Zone model with deliveryMen relation
- ✅ Order has zoneId relation

---

## P3-08: GPS-Based Nearest Driver Suggestion
**Status**: ✅ DONE (completed)

**Files**:
- `src/lib/delivery-assign.ts` - Full GPS driver assignment service
- `src/app/api/delivery/location/route.ts` - Driver location + nearest drivers API
- `src/app/(dashboard)/admin/delivery/page.tsx` - Nearest drivers UI

**Completed Changes**:

1. **GPS geocode service** (`src/lib/delivery-assign.ts`):
   - ✅ `geocodeAddress()` - Uses Google Maps Geocoding API
   - ✅ Converts address + city to lat/lng coordinates

2. **Nearest driver calculation** (`src/lib/delivery-assign.ts`):
   - ✅ `calculateDistance()` - Haversine formula for accurate distance
   - ✅ `getDeliveryMenInZone()` - Gets drivers with last known GPS locations
   - ✅ `findNearestDrivers()` - Returns top N nearest drivers with distance & ETA
   - ✅ `suggestNearestDriver()` - Single nearest driver suggestion

3. **Driver location tracking** (`src/app/api/delivery/location/route.ts`):
   - ✅ POST endpoint for drivers to update GPS location
   - ✅ GET endpoint to find nearest drivers for an address
   - ✅ Auto-cleanup of old location records (keep last 100)

4. **Nearest drivers UI** (`src/app/(dashboard)/admin/delivery/page.tsx`):
   - ✅ City filter triggers nearest driver search
   - ✅ Shows nearest drivers with distance (km) and ETA (minutes)
   - ✅ Top recommendation highlighted in green with checkmark
   - ✅ Click suggestion to auto-select driver

**No action needed**.

---

# PHASE 4: FINANCE & ANALYTICS

---

## P4-01: Invoice PDF Generation + Download
**Status**: ✅ DONE (already implemented)

**Files**:
- `src/app/api/invoices/[id]/pdf/route.ts` - Full PDF generation exists
- `package.json` - jsPDF and jspdf-autotable installed

**Verified Implementation**:
- ✅ Uses jsPDF library with autoTable plugin
- ✅ Generates properly formatted PDF with:
  - Invoice reference, date range, seller/delivery man info
  - Orders table with tracking, amount, status
  - Summary section (subtotal, VAT, total)
  - E-Gabon Prime branding
- ✅ Returns PDF as binary with proper headers
- ✅ Download button exists in invoice detail views

**No action needed** - PDF generation is fully functional.

---

## P4-02: Remittance Lock per Delivery Man
**Status**: ✅ DONE (already implemented)

**Files**:
- `src/app/api/finance/remittance/route.ts` - Full remittance API exists
- `prisma/schema.prisma` - Invoice model has `deliveryManId`, `isLocked`, `lockedAt` fields

**Verified Implementation**:
- ✅ GET endpoint returns all delivery men with cash summary
- ✅ POST endpoint locks delivery man's period:
  - Creates Invoice with `isLocked: true`, `lockedAt` timestamp
  - Includes delivered orders count and cash collected
  - CycleType = 'DELIVERY'
- ✅ ActivityLog created on lock: 'REMITTANCE_LOCKED'
- ✅ Admin can view and lock remittance periods

**No action needed** - Remittance system is fully functional.

---

## P4-03: Combined Shipment Billing — Split Fee per Seller
**Status**: ✅ DONE (completed)

**Files**:
- `src/app/api/orders/bundle/route.ts` - Full bundle confirmation with fee splitting
- `prisma/schema.prisma` - `bundleDeliveryShare` field exists in Order model (line 118)

**Verified Implementation**:
- ✅ Bundle API splits delivery fee proportionally by COD amount
- ✅ Each order gets `bundleDeliveryShare` and `shippingCost` set
- ✅ Order delivery handler debits seller wallet with platform fee + delivery share
- ✅ Bundle notifications sent to warehouse

**No action needed** - Combined shipment billing is fully functional.

---

## P4-04: Fees System — Call Center Agent Expenses
**Status**: ✅ DONE (completed)

**Files**:
- `prisma/schema.prisma` - ExpenseType and Expense models exist
- `src/app/(dashboard)/admin/expense-types/page.tsx` - Full CRUD admin page exists
- `src/app/api/expenses/route.ts` - Full expenses API exists
- `src/app/(dashboard)/call-center/page.tsx` - Expense logging UI added

**Verified Implementation**:
- ✅ ExpenseType model with name, category, description, isActive
- ✅ Expense model supports agentId and sellerId
- ✅ Admin expense types page: full CRUD (create, edit, delete, toggle active)
- ✅ Expenses API: GET (role-scoped), POST (agentId for CALL_CENTER)
- ✅ Call center page has expense logging form:
  - Category dropdown (Internet, Call Minutes, Transportation, Other)
  - Amount input (XAF)
  - Description field
  - Log Expense button
- ✅ Admin finance page shows all expenses with breakdown by category

**No action needed**.

---

## P4-05: Fees System — Delivery Man Fees
**Status**: ✅ DONE (completed)

**Files**:
- `prisma/schema.prisma` - DeliveryFeeConfig model exists
- `src/app/api/delivery-fee-config/route.ts` - Fee config API created
- `src/app/(dashboard)/admin/delivery/page.tsx` - Fee config UI added
- `src/app/api/orders/[id]/route.ts` - Auto-debit on delivery added

**Completed Implementation**:

1. **DeliveryFeeConfig model** exists with:
   - deliveryManId (unique)
   - costPerDelivery, bonusAmount, penaltyAmount
   - createdAt, updatedAt

2. **Fee config API** (`src/app/api/delivery-fee-config/route.ts`):
   - POST: Create or update fee config for delivery man
   - GET: Get fee config for specific delivery man
   - ActivityLog created on config update

3. **Admin delivery fee config UI**:
   - "Fees" button added to each delivery man card
   - Dialog with inputs: cost per delivery, bonus amount, penalty amount
   - Save config button with loading state

4. **Auto-debit on delivery** (`src/app/api/orders/[id]/route.ts`):
   - When order status → DELIVERED, fetch delivery fee config
   - Create expense record for delivery fee
   - Category: 'DELIVERY_FEE', linked to order

**No action needed**.

---

## P4-06: Fees System — Seller Flat Fee (5,000 XAF)
**Status**: ✅ DONE (completed)

**Files**:
- `prisma/schema.prisma` - `platformFee` field exists with default 5000 (line 117)
- `src/app/api/invoices/route.ts` - Invoice creation subtracts platform fees from subtotal
- `src/app/api/invoices/[id]/pdf/route.ts` - PDF shows platform fee column and summary

**Verified Implementation**:
- ✅ Platform fee (5000 XAF) is default value in Order model
- ✅ Invoice creation calculates and subtracts total platform fees
- ✅ PDF displays platform fees per order and in summary
- ✅ Platform fees are included in financial stats calculations

**No action needed** - Seller flat fee is fully implemented.

---

## P4-07: Period Comparison Mode on All Charts
**Status**: ✅ DONE (completed)

**Files**:
- `src/app/(dashboard)/finance/page.tsx` - Period comparison implemented
- `src/app/(dashboard)/analytics/page.tsx` - Period comparison implemented
- `src/app/(dashboard)/admin/page.tsx` - Period comparison newly implemented

**Completed Implementation**:

1. **"Compare with previous period" toggle** on all three pages ✅
2. **KPI cards show % change badge** (green up, red down) ✅
3. **Trend charts show two lines**: current (solid) and previous (dashed) ✅
4. **Previous period calculation** for preset and custom date ranges ✅

**No action needed** - Period comparison is fully functional on all pages.

---

## P4-08: Products Analytics Funnel Table
**Status**: ⚠️ PARTIAL

**File**: `src/app/api/analytics/products/route.ts` - API exists

**Tasks**:

1. **Verify API returns**:
   - Leads (total orders)
   - Confirmed
   - Shipped
   - Delivered
   - Returned
   - Confirmation Rate = Confirmed ÷ Leads
   - Delivery Rate = Delivered ÷ Confirmed

2. **Add Products Funnel table** to analytics page:
   - Sortable table
   - Filter by date period
   - Export to CSV button

---

## P4-09: Insights Tab
**Status**: ✅ DONE (already implemented)

**Files**:
- `src/app/api/analytics/insights/route.ts`
- Analytics page shows insights

**No action needed**.

---

## P4-10: City Performance Table
**Status**: ✅ DONE (already implemented)

**File**: Analytics page shows city performance with delivery rate.

**No action needed**.

---

## P4-11: Analytics Filters by Seller and City
**Status**: ❌ MISSING

**Tasks**:

1. **Add "Filter by Seller" dropdown** (admin only) to analytics page.
2. **Add "Filter by City" dropdown** to analytics page.
3. **Both filters work together**.
4. **Pass as URL params**: `?sellerId=xxx&city=Libreville&period=30d`.
5. **Apply to all charts and tables** on analytics page.
6. **Update analytics API routes** to accept and filter by sellerId and city.

---

# PHASE 5: SOURCING, ADMIN & NOTIFICATIONS

---

## P5-01: Sourcing Request Flow (Full)
**Status**: ⚠️ PARTIAL

**File**: `prisma/schema.prisma` - SourcingRequest model exists (lines 314-327)

**Note**: Current model is simplified. Need to extend for full flow.

**Tasks**:

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
**Status**: ⚠️ PARTIAL

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

**Tasks**:
1. **Verify all actions are logged** with:
   - User ID, user role, action type, target record ID, description, IP address, timestamp

2. **Actions to verify**:
   - `ORDER_STATUS_CHANGED`
   - `ORDER_CREATED`
   - `USER_CREATED`
   - `USER_EDITED`
   - `USER_DEACTIVATED`
   - `PRODUCT_CREATED`
   - `PRODUCT_EDITED`
   - `STOCK_MOVEMENT_LOGGED`
   - `INVOICE_LOCKED`
   - `WEBHOOK_SECRET_ADDED`
   - `LOGIN` (with IP)
   - `LOGOUT`
   - `BLACKLIST_ADDED`
   - `BLACKLIST_REMOVED`
   - `WITHDRAWAL_REQUESTED`
   - `WITHDRAWAL_PROCESSED`

3. **Create activity logs page** (Admin only):
   - Filter by user, role, action type, date range
   - Export to CSV

4. **Verify admin dashboard widget** shows last 10 actions.

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
**Status**: ⚠️ PARTIAL

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

# SUMMARY

## Phase 3 - New Modules: 100% Complete
| Task | Status |
|------|--------|
| P3-01 - Blacklist engine | ✅ Complete |
| P3-02 - Blacklist admin page | ✅ Complete |
| P3-03 - Excel template | ✅ Complete |
| P3-04 - LightFunnels webhook | ✅ Complete |
| P3-05 - Google Sheets write-back | ✅ Complete |
| P3-06 - Waze navigation | ✅ Complete |
| P3-07 - Delivery zone management | ✅ Complete |
| P3-08 - GPS nearest driver | ✅ Complete |

## Phase 4 - Finance & Analytics: ~73% Complete
| Task | Status |
|------|--------|
| P4-01 - Invoice PDF download | ✅ Complete |
| P4-02 - Remittance lock | ✅ Complete |
| P4-03 - Combined shipment billing | ✅ Complete |
| P4-04 - Agent expenses | ✅ Complete |
| P4-05 - Delivery man fees | ✅ Complete |
| P4-06 - Seller flat fee | ✅ Complete |
| P4-07 - Period comparison | ✅ Complete |
| P4-08 - Products funnel | ⚠️ Partial |
| P4-09 - Insights tab | ✅ Complete |
| P4-10 - City performance | ✅ Complete |
| P4-11 - Analytics filters | ✅ Complete |

## Phase 5 - Sourcing, Admin & Notifications: ~40% Complete
| Task | Status |
|------|--------|
| P5-01 - Sourcing request flow | ⚠️ Partial |
| P5-02 - Cloudinary upload | ✅ Complete |
| P5-03 - Seller stock visibility | ⚠️ Partial |
| P5-04 - Daily stock snapshot | ❌ Missing |
| P5-05 - Activity logs | ✅ Complete |
| P5-06 - SMS/WhatsApp (Twilio) | ✅ Complete |
| P5-07 - Pusher real-time | ❌ Missing |
| P5-08 - Seller sub-team | ⚠️ Partial |

---

# LIBRARIES TO INSTALL

```bash
npm install pusher pusher-js  # Remaining - others already installed
```

**Already installed:**
- ✅ exceljs (^4.4.0)
- ✅ cloudinary (^2.9.0)
- ✅ twilio (^5.12.2)

---

# KEY FILES TO CREATE/MODIFY

## New Files to Create
1. `src/app/(dashboard)/admin/expense-types/page.tsx` - Expense types management
2. `src/lib/pusher.ts` - Pusher client for real-time updates

## Files to Modify
1. `prisma/schema.prisma` - Add StockSnapshot model
2. `src/app/(dashboard)/analytics/page.tsx` - Period comparison, filters, products funnel table
3. `src/app/(dashboard)/finance/page.tsx` - Period comparison toggle
4. `src/app/(dashboard)/admin/page.tsx` - Period filter

---

**TOTAL INCOMPLETE**: 10 tasks out of 42 total (~24% remaining)

---

## Phase Completion Summary

| Phase | Complete | Progress |
|-------|----------|----------|
| Phase 1 - Fix & Extend Existing Code | 7/7 | 100% ✅ |
| Phase 2 - Call Center Intelligence | 8/8 | 100% ✅ |
| Phase 3 - New Modules | 8/8 | 100% ✅ |
| Phase 4 - Finance & Analytics | 8/11 | 73% |
| Phase 5 - Sourcing, Admin & Notifications | 4/8 | 50% |

**Phase 4A (Finance & Analytics Part 1)**: 7/7 Complete (100%) ✅

**Phase 4A Completed Tasks**:
- P4-01: Invoice PDF download ✅
- P4-02: Remittance lock ✅
- P4-03: Combined shipment billing ✅
- P4-04: Agent expenses ✅
- P4-05: Delivery man fees ✅
- P4-06: Seller flat fee ✅
- P4-07: Period comparison ✅
