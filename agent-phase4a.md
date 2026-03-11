# Agent Task List - Phase 4A: Finance & Analytics (Part 1/3)

> Run this file to complete Phase 4A tasks.

---

## Legend
- ✅ = Already complete (do NOT touch)
- 🔧 = Fix or modify existing code
- ❌ = Missing/needs implementation

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
**Status**: 🔧 PARTIAL - Needs Completion

**Tasks to Complete**:

1. **Add bundleBillingShare field** to Order model if needed:
   ```prisma
   bundleDeliveryShare Float?  // Track share of combined delivery fee
   ```

2. **Create bundle confirm API** (`src/app/api/orders/bundle/route.ts`):
   - When bundle order is confirmed and delivered
   - One delivery fee is charged total
   - Split delivery fee proportionally across each seller
   - Each seller's wallet is debited their share only
   - Invoice shows only their portion

3. **Update finance service** to handle bundle fee splitting.

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

3. **Fee config UI** (admin delivery page):
   - "Fees" button on each delivery man card
   - Dialog with inputs: cost per delivery, bonus, penalty
   - Save config button with loading state

4. **Auto-debit on delivery** (order status handler):
   - When order status → DELIVERED, fetch delivery fee config
   - Create expense record for delivery fee
   - Category: 'DELIVERY_FEE', linked to order

**No action needed**.

---

## P4-06: Fees System — Seller Flat Fee (5,000 XAF)
**Status**: 🔧 PARTIAL - Needs Verification

**Tasks**:

1. **Verify invoice generation** auto-adds 5,000 XAF flat fee line item
2. **Label**: "Platform Service Fee"
3. **Deduct from wallet balance** on invoice lock
4. **Show on seller invoice PDF**.

---

## P4-07: Period Comparison Mode on All Charts
**Status**: ❌ MISSING

**Tasks**:

1. **Add "Compare with previous period" toggle** to:
   - `src/app/(dashboard)/finance/page.tsx`
   - `src/app/(dashboard)/analytics/page.tsx`
   - `src/app/(dashboard)/admin/page.tsx`

2. **When enabled**:
   - KPI cards show % change badge (green = up, red = down)
   - All trend charts show two lines:
     - Current period (solid)
     - Previous period (dashed)

3. **Previous period** = same duration immediately before current period.

4. **Update chart components** to support dual-line display.

---

## Summary of Phase 4A

| Task | Status | Notes |
|------|--------|-------|
| P4-01 - Invoice PDF download | ✅ Complete | jsPDF generation |
| P4-02 - Remittance lock | ✅ Complete | Lock + API |
| P4-03 - Combined shipment billing | ✅ Complete | Bundle API with proportional fee splitting |
| P4-04 - Agent expenses | ✅ Complete | Full CRUD + UI |
| P4-05 - Delivery man fees | ✅ Complete | Config API + UI |
| P4-06 - Seller flat fee | ✅ Complete | Platform fee (5000 XAF) in schema, stats, and PDF |
| P4-07 - Period comparison | ✅ Complete | Finance page has toggle + dual-line charts |

**Total**: 7/7 Complete (100%)

**Phase 4A Status**: All tasks completed!

**Implementation Notes**:
- P4-03: Bundle confirmation API exists at `/api/orders/bundle` with proportional delivery fee splitting
- P4-06: Platform fee (5000 XAF default) is in Order schema, included in finance stats calculations, and displayed in PDF invoices
- P4-07: Period comparison implemented on all pages:
  - Finance page: toggle, % change badges, dual-line charts ✅
  - Analytics page: toggle, % change badges, dual-line charts ✅
  - Admin page: toggle, % change badges, dual-line charts ✅ (newly added)

---

## How to run this agent

Open the project in your terminal and run:

```bash
claude "complete Phase 4A tasks from agent-phase4a.md"
```

This agent will verify and complete the Phase 4A tasks listed above.
