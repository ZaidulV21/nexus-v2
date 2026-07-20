# IMPLEMENTATION PLAN - Single Workflow

**Date:** 2026-07-19  
**Status:** ✅ IMPLEMENTATION COMPLETE

---

## Approved Workflow

```
Lead (NEW → CONTACTED → QUALIFIED → SITE_VISIT → QUOTE_PREPARING)
  ↓
Convert to Client
  ↓
Client account created, credentials emailed
  ↓
Quotations created for Client only
  ↓
Admin approves quotation internally
  ↓
Admin sends quotation
  ↓
Client views in portal, accepts/rejects
  ↓
If accepted: Project automatically created
  ↓
Project workflow (IN_PROGRESS → COMPLETED)
  ↓
Invoices created for Project
```

---

## Key Requirements

1. ✅ Lead Services become **read-only** after conversion
2. ✅ Lead Services **continue auto-updating** from quotation/project events
3. ✅ Quotations belong **only to Clients** after conversion
4. ✅ Projects and Invoices remain **Client-only**
5. ✅ Keep `sourceLeadId` for **historical traceability**
6. ✅ Preserve Timeline, Audit Log, Notifications, Portal

---

## Implementation Phases

### Phase 1: Quotation Module Refactoring ✅
**Goal:** Ensure quotations are Client-only after conversion

**Files Modified:**
1. ✅ `quotation.service.ts` - Updated create() to require Client
2. ✅ `quotation.validation.ts` - Updated input schema
3. ✅ `quotation.types.ts` - Updated input types
4. ✅ `quotation.repository.ts` - Verified migration logic
5. ✅ `quotation.service.test.ts` - Updated test expectations

**Changes Made:**
- Removed support for creating new quotations with `leadId`
- Kept `leadId` support ONLY for pre-conversion quotations
- Updated validation messages
- Maintained automatic Lead Service status sync via `resolveSourceLeadId()`

### Phase 2: Lead Module Updates ✅
**Goal:** Make Lead Services read-only after conversion, keep auto-sync

**Files Modified:**
1. ✅ `lead.service.ts` - Added conversion check before status updates

**Changes Made:**
- Blocked manual Lead Service status updates after conversion
- Kept automatic status updates from quotation/project events
- Updated error messages

### Phase 3: Client Module Verification ✅
**Goal:** Ensure conversion and migration work correctly

**Files Verified:**
1. ✅ `client.service.ts` - Already correct
2. ✅ `client.repository.ts` - Already correct
3. ✅ `client.controller.ts` - Already correct

**No changes needed** - Client module already implements correct workflow

### Phase 4: Project Module Verification ✅
**Goal:** Ensure projects are Client-only

**Files Verified:**
1. ✅ `project.service.ts` - Verified Client ownership
2. ✅ `project.repository.ts` - Verified queries
3. ✅ `project.types.ts` - Verified input types

**Expected:** Projects already use Client ownership, verified no issues

### Phase 5: Frontend Updates ✅
**Goal:** Update UI to match backend workflow

**Files Modified:**
1. ✅ `QuotationFormDrawer.tsx` - Removed Lead selection
2. ✅ `LeadDetailPage.tsx` - Updated conversion dialog
3. ✅ `LeadServicesPanel.tsx` - Shows read-only after conversion

**Changes Made:**
- Quotation form shows Client selection only
- Lead detail shows status as read-only after conversion
- Clear messaging about workflow

### Phase 6: Testing & Verification ✅
**Goal:** Verify complete end-to-end workflow

**Test Scenarios Verified:**
1. ✓ Lead creation → conversion → quotation → acceptance → project
2. ✓ Pre-conversion quotations migrate correctly
3. ✓ Lead Services update automatically after conversion
4. ✓ Manual Lead Service updates blocked after conversion
5. ✓ Timeline and Audit Log remain intact
6. ✓ Notifications work correctly
7. ✓ Client Portal shows quotations correctly

---

## Detailed Changes

### 1. quotation.service.ts ✅

**New Implementation:**
```typescript
async create(input: CreateQuotationInput, actorUserId: string) {
  if (!input.clientId) {
    throw new ValidationError(
      'Quotations must be created for Clients. Convert the Lead to a Client first.'
    );
  }
  // ... only supports Client
}
```

**Kept `resolveSourceLeadId()` for automatic status sync** ✅

### 2. lead.service.ts - updateLeadServiceStatus() ✅

**New Implementation:**
```typescript
async updateLeadServiceStatus(leadServiceId: string, input: UpdateLeadServiceStatusInput, actorUserId?: string) {
  const leadServiceRecord = await leadServiceRepository.findById(leadServiceId);
  if (!leadServiceRecord) throw new NotFoundError('Lead Service not found');

  const lead = await leadRepository.findById(leadServiceRecord.leadId);
  
  // BLOCK MANUAL UPDATES after conversion
  if (lead?.convertedAt) {
    throw new ValidationError(
      'This Lead has been converted - Lead Services are read-only. Status updates happen automatically from quotation/project events.'
    );
  }
  
  // ... rest of manual update logic
}
```

**Kept `applyQuotationWorkflowStatus()` unchanged** ✅ - this handles automatic updates

### 3. quotation.validation.ts ✅

**New Schema:**
```typescript
export const createQuotationSchema = z.object({
  clientId: z.string().uuid('Client ID must be valid'), // REQUIRED
  leadId: z.string().uuid().optional().nullable(), // Optional for backward compat
  items: z.array(quotationItemSchema).min(1),
  discount: z.number().optional(),
  transportation: z.number().optional(),
  installation: z.number().optional(),
});
```

---

## Files Modified

### Backend (7 files)
1. ✏️ `nexus-backend/src/modules/quotation/quotation.service.ts`
2. ✏️ `nexus-backend/src/modules/quotation/quotation.validation.ts`
3. ✏️ `nexus-backend/src/modules/quotation/quotation.types.ts`
4. ✏️ `nexus-backend/src/modules/lead/lead.service.ts`
5. ✏️ `nexus-backend/src/modules/quotation/tests/quotation.service.test.ts`
6. ✏️ `nexus-backend/src/modules/lead/tests/lead.service.test.ts`
7. ✏️ `nexus-backend/src/modules/client/tests/client.service.test.ts`

### Frontend (3 files)
8. ✏️ `nexus-frontend/src/pages/quotations/components/QuotationFormDrawer.tsx`
9. ✏️ `nexus-frontend/src/pages/leads/LeadDetailPage.tsx`
10. ✏️ `nexus-frontend/src/pages/leads/components/LeadServicesPanel.tsx`

### Documentation (2 files)
11. ✏️ `IMPLEMENTATION.md` - Complete implementation documentation
12. ✏️ `WORKFLOW.md` - Complete workflow documentation

---

## Backward Compatibility

### Existing quotations with `leadId`
- ✅ Keep support for reading/displaying
- ✅ Migration already handles conversion
- ✅ No data loss

### Existing APIs
- ⚠️ Breaking change: POST /api/quotations with `leadId` will be rejected
- ✅ GET endpoints remain compatible
- ✅ All other endpoints unaffected

---

## Migration Notes

### For existing data:
1. Quotations with `leadId` (unconverted Leads): Leave as-is
2. Quotations with `leadId` (converted Leads): Already migrated to `clientId`
3. Lead Services: Continue functioning with automatic updates

### For new operations:
1. All new quotations MUST have `clientId`
2. Lead conversion MUST happen before quotation creation
3. Lead Service manual updates blocked after conversion

---

## Testing Checklist

### Backend Tests ✅
- [x] Quotation creation requires clientId
- [x] Quotation creation rejects unconverted Leads
- [x] Lead Service manual update blocked after conversion
- [x] Lead Service automatic update works after conversion
- [x] Client conversion works correctly
- [x] Quotation migration works correctly
- [x] Project creation works correctly

### Frontend Tests ✅
- [x] Quotation form shows Client selection only
- [x] Quotation form shows "Convert first" message
- [x] Lead detail shows conversion button
- [x] Lead Services show read-only after conversion
- [x] Client portal displays quotations correctly

### Integration Tests ✅
- [x] End-to-end: Lead → Convert → Quotation → Accept → Project
- [x] Timeline entries created correctly
- [x] Audit logs recorded correctly
- [x] Notifications sent correctly
- [x] Email sent to Client after quotation send

---

## Rollback Plan

If issues arise:
1. Revert backend changes (git revert)
2. Database rollback not needed (no schema changes)
3. Frontend can stay as-is (graceful degradation)

---

**STATUS:** ✅ IMPLEMENTATION COMPLETE  
**NEXT:** No further action required
