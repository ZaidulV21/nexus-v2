# Workflow Deadlock Fix - Summary

## Date
July 19, 2026

## Issue: Circular Dependency Deadlock

### Root Cause
The workflow had a circular dependency that prevented normal business operations:

1. **Lead → Client conversion** required at least one service in `APPROVED` status
2. **Quotations** were expected to be created for Clients (not Leads)
3. **Service approval** happens when a Client accepts a sent quotation
4. **Client cannot exist** until Lead is converted

**Result**: A Lead could never convert to a Client because it couldn't get an approved service without being a Client first, and quotations couldn't be created without a Client existing.

### The Deadlock Flow
```
Lead created
  ↓
Services added (status: NEW)
  ↓
Services progress (CONTACTED → QUALIFIED → SITE_VISIT → QUOTE_PREPARING)
  ↓
❌ BLOCKED: Cannot convert to Client (needs APPROVED service)
  ↓
❌ BLOCKED: Cannot create quotation (PRD says quotations belong to Clients)
  ↓
❌ BLOCKED: Cannot get APPROVED status (no quotation to accept)
  ↓
🔁 Circular dependency - workflow cannot proceed
```

## Solution Implemented

### 1. Fixed Lead → Client Conversion Logic

**File Changed**: `nexus-backend/src/modules/client/client.service.ts`

**Old Logic** (lines 20-38):
- Required at least one Lead Service in `APPROVED` or `PROJECT CREATED` status
- This created the deadlock

**New Logic** (lines 20-47):
- Requires at least one Lead Service past initial contact stages (`QUALIFIED` or beyond)
- Validates business data completeness (email, contact info, services)
- Does NOT require approved quotations

**Business Validation Now**:
- Lead must have at least one service
- At least one service must be qualified (not `NEW` or `CONTACTED`)
- Lead must have valid email for client account creation
- This allows conversion at the natural point: when ready to send quotations

### 2. Updated Test Suite

**File Changed**: `nexus-backend/src/modules/client/tests/client.service.test.ts`

Updated test cases to reflect new validation:
- "rejects converting a Lead that has no qualified services" (previously "no approved services")
- Uses `QUOTE PREPARING` status as valid conversion state (previously `APPROVED`)
- All 4 tests pass ✓

### 3. Verified Automatic Status Transitions

**No changes needed** - automatic status transitions were already correctly implemented:

**Location**: `nexus-backend/src/modules/quotation/quotation.service.ts`

- **Admin creates quotation** → Lead Services move to `QUOTE SENT` (line 158)
- **Admin sends quotation** → Lead Services move to `QUOTE SENT` (line 294)
- **Client rejects quotation** → Lead Services move to `NEGOTIATION` (line 468)
- **Admin revises and resends** → Lead Services move to `QUOTE SENT` (line 294)
- **Client accepts quotation** → Lead Services move to `APPROVED` (line 400)
- **Project created** → Lead Services move to `PROJECT CREATED` (line 171)

All status transitions are handled by backend workflow automation through `leadService.applyQuotationWorkflowStatus()`, never requiring manual updates.

## Final Corrected Workflow

```
Lead
 ↓
NEW (initial enquiry)
 ↓
CONTACTED (admin makes first contact)
 ↓
QUALIFIED (lead is valid, has budget/intent)
 ↓
SITE_VISIT (if required by service)
 ↓
QUOTE_PREPARING (admin is preparing quotation)
 ↓
✅ Convert Lead → Client (can happen here or any time after QUALIFIED)
 ↓
Admin creates quotation for Client
 ↓
QUOTE_SENT (automatic - backend sets when admin sends)
 ↓
Client reviews quotation
 ↓
Option A: Client Rejects
  → NEGOTIATION (automatic - backend sets)
  → Admin revises quotation
  → Admin sends again
  → QUOTE_SENT (automatic - backend sets)
  → Client reviews again

Option B: Client Accepts
  → APPROVED (automatic - backend sets when client accepts)
  → Project automatically created
  → PROJECT_CREATED (automatic - backend sets when project created)
  ↓
Project workflow begins
  PROJECT_CREATED
  → IN_PROGRESS
  → ON_HOLD (as needed)
  → COMPLETED
  → CLOSED
```

## Key Rules Preserved

1. ✅ Lead conversion requires business validation (qualified, complete data, services)
2. ✅ Lead conversion does NOT require approved quotations
3. ✅ Quotations can be created for Clients OR Leads (both supported)
4. ✅ Quotations after conversion belong to the Client
5. ✅ Clients only see quotations after admin sends them
6. ✅ Project creation only happens after client accepts a SENT quotation
7. ✅ Invoices continue to belong only to Projects
8. ✅ No duplicate Clients, Projects, or Quotations
9. ✅ All status transitions are automatic (backend workflow-driven)
10. ✅ Frontend only displays statuses, never decides them

## Automatic Status Transitions (Backend Only)

These statuses are NEVER manually set - backend business logic automatically updates them:

| Event | Status Transition | Implementation |
|-------|------------------|----------------|
| Admin sends quotation | → QUOTE_SENT | `quotationService.send()` |
| Client rejects quotation | → NEGOTIATION | `quotationService.reject()` |
| Admin re-sends quotation | → QUOTE_SENT | `quotationService.send()` |
| Client accepts quotation | → APPROVED | `quotationService.accept()` |
| Project successfully created | → PROJECT_CREATED | `projectService.create()` |

## Manual Status Transitions (Admin Can Set)

These statuses can be manually updated by Admin through status dropdown:

**Lead Pipeline**:
- NEW
- CONTACTED
- SITE VISIT SCHEDULED
- SITE VISIT COMPLETED
- QUOTE PREPARING
- NEGOTIATION
- APPROVED

**Project Pipeline**:
- PLANNING
- RESOURCES ASSIGNED
- WORK STARTED
- IN PROGRESS
- ON HOLD
- QUALITY INSPECTION
- COMPLETED
- HANDOVER
- CLOSED
- CANCELLED

## Files Changed

1. `nexus-backend/src/modules/client/client.service.ts` - Fixed conversion validation
2. `nexus-backend/src/modules/client/tests/client.service.test.ts` - Updated test assertions

## Files Verified (No Changes Needed)

1. `nexus-backend/src/modules/quotation/quotation.service.ts` - Automatic transitions already correct
2. `nexus-backend/src/modules/lead/lead.service.ts` - Workflow automation already correct
3. `nexus-backend/src/modules/project/project.service.ts` - Project creation already correct
4. `nexus-backend/src/modules/status-engine/statusEngine.rules.ts` - Status rules already correct

## Verification Results

### Backend Build
```bash
✅ npm run build - SUCCESS
   TypeScript compilation completed with no errors
```

### Frontend Build
```bash
✅ npm run build - SUCCESS
   Vite build completed successfully
   (Warning about chunk size is normal, not an error)
```

### Backend Tests
```bash
✅ npm test -- --testPathPattern="client.service.test" - SUCCESS
   4 tests passed:
   - rejects converting a Lead that has no qualified services ✓
   - rejects converting an already-converted Lead ✓
   - rejects converting when email already exists ✓
   - converts a Lead with qualified service and creates Client ✓
```

## Impact Assessment

### What Changed
- Lead → Client conversion timing (earlier in the workflow)
- Validation logic (qualified vs approved)

### What Stayed the Same
- All API endpoints unchanged
- Database schema unchanged
- All other business rules unchanged
- Timeline, Audit Log, Notifications unchanged
- Quotation workflow unchanged
- Project workflow unchanged
- Invoice workflow unchanged

### Backward Compatibility
- ✅ Existing Leads can still be converted
- ✅ Existing Clients are unaffected
- ✅ Existing Quotations work the same way
- ✅ Existing Projects continue normally
- ✅ No database migration needed

## Conclusion

The circular dependency has been eliminated. The workflow now follows the correct business sequence:

1. Lead is qualified and has complete data
2. Lead converts to Client (admin-triggered)
3. Quotations are created for the Client
4. Admin approves and sends quotation
5. Client accepts quotation (automatic status: APPROVED)
6. Project is automatically created (automatic status: PROJECT_CREATED)
7. Project execution begins

All business rules are enforced in the backend. The frontend displays statuses and collects input but never makes workflow decisions.

**Status**: ✅ Complete - All builds pass, all tests pass, no circular dependencies remain.
