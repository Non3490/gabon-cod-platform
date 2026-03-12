# Frontend Tasks - Gabon COD Platform

> Run this file to complete all frontend/UI-related tasks.

## Overview
These tasks focus on adding UI components, pages, and frontend functionality.

---

## Task 1: Products Analytics Funnel Table

**Status**: ⚠️ PARTIAL - API exists, UI table needed

**Files to Modify**: `src/app/(dashboard)/analytics/page.tsx`

### Tasks

1. **Add Products Funnel table** to analytics page:
   - Sortable columns: Product Name, Leads, Confirmed, Shipped, Delivered, Returned, Confirmation Rate, Delivery Rate
   - Filter by date period (7d, 30d, 90d, custom)
   - Export to CSV button

2. **Table columns**:
   ```
   | Product Name | Leads | Confirmed | Shipped | Delivered | Returned | Conf. Rate | Del. Rate |
   ```

3. **Verification**:
   - Call API: `GET /api/analytics/products?period=30d`
   - Verify data displays correctly
   - Verify sorting works
   - Verify export downloads CSV

---

## Task 2: Sourcing Request Flow - Frontend Pages

**Status**: ⚠️ PARTIAL - Model exists, pages needed

### Files to Create:
1. `src/app/(dashboard)/seller/sourcing/page.tsx` - Seller sourcing dashboard
2. `src/app/(dashboard)/admin/sourcing/page.tsx` - Admin sourcing management

### Tasks

#### 2.1: Seller Sourcing Page (`/seller/sourcing`)

Create a page with:

**Tabs:**
- "New Request" tab
- "My Requests" tab

**New Request Form:**
- Product Name (input)
- Description (textarea)
- Images (file upload - use Cloudinary upload API)
- Quantity (number input)
- Country (dropdown)
- Shipping Method (dropdown: Air, Sea, Land)
- Submit button

**My Requests List:**
- Table showing: Product, Quantity, Country, Status, Created At
- Status badges: SUBMITTED (yellow), IN_TRANSIT (blue), RECEIVED (green), STOCKED (purple), REJECTED (red)
- View details button

#### 2.2: Admin Sourcing Page (`/admin/sourcing`)

Create a page with:

**Tabs:**
- "All Requests" tab
- "Pending Review" tab

**All Requests Table:**
- Columns: Seller, Product, Quantity, Country, Status, Created At
- Actions button per row

**Request Details Modal** (click on a request):
- Show all request details
- Images preview
- Admin actions based on status:

  For SUBMITTED:
  - "Approve & Mark In Transit" button
  - "Reject" button with note input

  For IN_TRANSIT:
  - "Mark as Received" button → opens receipt form

  **Receipt Form** (when marking received):
  - Actual Quantity Received (number)
  - Damaged Quantity (number)
  - Received Images (file upload)
  - "Save Receipt" button

  For RECEIVED:
  - "Mark as Stocked" button

---

## Task 3: Verify Seller Stock Visibility

**Status**: ⚠️ PARTIAL - Needs verification

**Files to Check**: `src/app/(dashboard)/seller/stock/page.tsx`

### Tasks

1. **Verify seller dashboard shows their own stock levels per product**
   - Check: Only seller's products shown
   - Check: Quantity displayed correctly
   - Check: Product images shown

2. **Verify low stock alerts visible**
   - Check: Alert badge when quantity < 10
   - Check: Warning message displayed

3. **Verify seller cannot see other sellers' stock**
   - Test with different seller accounts
   - Verify no cross-seller data leak

### If issues found:
- Fix data queries in stock page
- Add proper role scoping
- Test thoroughly

---

## Task 4: Verify Seller Sub-Team Management

**Status**: ⚠️ PARTIAL - Page exists, functionality needs verification

**Files to Check**: `src/app/(dashboard)/seller/team/page.tsx`

### Tasks

1. **Verify team management page shows list of sub-users**

2. **Test "Invite Agent" functionality**:
   - Email input
   - "Send Invite" button
   - Creates new user with:
     - role = 'CALL_CENTER'
     - parentSellerId = seller.id
     - inviteToken = random string

3. **Test sub-user can only see parent seller's orders**:
   - Login as sub-user
   - Verify call center shows only parent seller's NEW orders
   - Verify cannot access other sellers' data

4. **Test "Deactivate" functionality**:
   - Deactivate button per team member
   - User.isActive set to false
   - Deactivated user cannot login

### If issues found:
- Fix invite API
- Add proper parentSellerId filtering in queue
- Add invite email template
- Test end-to-end

---

## Summary

| Task | Priority | Est. Time |
|------|----------|-----------|
| Task 1: Products Funnel Table | High | 2-3 hrs |
| Task 2: Sourcing Request Flow | High | 4-5 hrs |
| Task 3: Verify Stock Visibility | Medium | 1 hr |
| Task 4: Verify Sub-Team | Medium | 2-3 hrs |

**Total Estimated Time: 9-12 hours**

---

## Dependencies

None - these are independent frontend tasks that can be worked in parallel.

---

## Testing Checklist

After completing all tasks:

- [ ] Products funnel table displays correctly
- [ ] Products funnel sorting works
- [ ] Products funnel CSV export works
- [ ] Seller can create sourcing request
- [ ] Seller can view their sourcing requests
- [ ] Admin can approve sourcing request
- [ ] Admin can mark request in transit
- [ ] Admin can receive sourcing request
- [ ] Admin can stock received items
- [ ] Seller stock shows only their products
- [ ] Low stock alert displays
- [ ] Seller can invite team member
- [ ] Sub-user scoped to parent seller
- [ ] Deactivate team member works

---

**Created for agent execution**
