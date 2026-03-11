# Agent Task List - Phase 1: Fix & Extend Existing Code

> Run this file to complete Phase 1 tasks.

## Legend
- ✅ = Already complete (do NOT touch)
- 🔧 = Fix or modify existing code
- ❌ = Missing/needs implementation

---

## P1-01: Deduplication 30 days → 15 days
**Status**: ✅ DONE (already implemented)
**File**: `src/lib/order-service.ts`
**Note**: Line 23 already uses `15` days - no action needed.

---

## P1-02: Update Bulk Label Print Format to 4×6 Thermal
**Status**: ✅ DONE (already implemented)
**File**: `src/components/orders/PrintLabelsButton.tsx`
**Note**: Already uses 102mm × 152mm format with jsPDF - no action needed.

---

## P1-03: Delete POD Photo Capture UI Entirely
**Status**: ✅ DONE (verified, no UI exists)

**Tasks**:
1. ✅ Check `src/app/(dashboard)/delivery/page.tsx`
2. ✅ Verified - POD photo capture UI (file input, camera, upload button, photo preview) does NOT exist
3. ✅ No photo-related UI elements present in delivery page
4. ✅ `podPhotoUrl` not in delivery update payload
5. ✅ Kept `podPhotoUrl` field in DB schema - no migration needed

**Note**: No photo capture UI exists, only the TypeScript interface field remains for API compatibility.

---

## P1-04: Extend Order Statuses from 5 to 13
**Status**: ✅ DONE (already implemented)
**File**: `prisma/schema.prisma`
**Note**: Line 83 already includes all 13 statuses including:
- POSTPONED, NO_ANSWER, BUSY, CALLBACK, UNREACHED, WRONG_NUMBER, DOUBLE, RETURN_TO_STOCK

---

## P1-05: Order Source Tracking Field
**Status**: ✅ DONE (already implemented)
**File**: `prisma/schema.prisma`
**Note**: Line 84 already includes `source` field with default "MANUAL" and all required sources.

---

## P1-06: Enforce Call Center Cannot See Cost Price or Margin
**Status**: ✅ DONE (implemented)

**Tasks**:
1. ✅ Check `src/app/api/orders/route.ts` - No cost fields exposed
2. ✅ Check `src/app/api/products/route.ts` - Already strips `costPrice` for CALL_CENTER
3. ✅ Updated `src/app/api/dashboard/route.ts` to strip cost fields for CALL_CENTER:
   - `productCost`, `shippingCost`, `callCenterFee`, `adSpend`
   - Computed `totalProfit` omitted for CALL_CENTER
4. ✅ Updated admin page to conditionally hide Net Profit card for CALL_CENTER

**Must keep visible to call center**:
- ✅ `codAmount` (what customer pays)
- ✅ seller name
- ✅ product name
- ✅ product description

**Files Modified**:
- `src/app/api/dashboard/route.ts` - Added CALL_CENTER field stripping
- `src/app/(dashboard)/admin/page.tsx` - Made totalProfit optional, conditionally render Net Profit card

---

## P1-07: Period Filters on Finance, Analytics, and Dashboard
**Status**: ✅ DONE (implemented)

**Files**:
- ✅ `src/app/(dashboard)/finance/page.tsx` - Has period filter (lines 98-100)
- ✅ `src/app/(dashboard)/analytics/page.tsx` - Has period filter (lines 27-29)
- ✅ `src/app/(dashboard)/admin/page.tsx` - Added period dropdown

**Tasks**:
1. ✅ Added period dropdown to admin page with:
   - Today
   - 7 days
   - 30 days
   - Custom range (UI added, backend ready)
2. ✅ Pass as query param: `?period=today|7d|30d&dateFrom=&dateTo=`
3. ✅ Updated `/api/dashboard` to accept and process period params

**Files Modified**:
- `src/app/(dashboard)/admin/page.tsx` - Added Period type, state, Select component
- `src/app/api/dashboard/route.ts` - Added period param processing, date filtering

---

## Summary of Phase 1

| Task | Status |
|------|--------|
| P1-01 - Deduplication 15 days | ✅ Complete |
| P1-02 - Label print 4×6 thermal | ✅ Complete |
| P1-03 - Delete POD photo UI | ✅ Complete (verified none exists) |
| P1-04 - Order statuses 13 | ✅ Complete |
| P1-05 - Source tracking | ✅ Complete |
| P1-06 - Call center field stripping | ✅ Complete |
| P1-07 - Period filters | ✅ Complete |

**Total**: 7/7 Complete (100%) ✅
