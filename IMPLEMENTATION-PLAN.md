# IMPLEMENTATION PLAN - Single Workflow
**Date:** 2026-07-19
**Status:** IMPLEMENTATION IN PROGRESS

---

## APPROVED WORKFLOW

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

## KEY REQUIREMENTS

1. ✅ Lead Services become **read-only** after conversion
2. ✅ Lead Services **continue auto-updating** from quotation/project events
3. ✅ Quotations belong **only to Clients** after conversion
4. ✅ Projects and Invoices remain **Client-only**
5. ✅ Keep `sourceLeadId` for **historical traceability**
6. ✅ Preserve Timeline, Audit Log, Notifications, Portal

---

## IMPLEMENTATION PHASES

### Phase 1: Quotation Module Refactoring
**Goal:** Ensure quotations are Client-only after conversion

**Files to modify:**
1. `quotation.service.ts` - Update create() to require Client
2. `quotation.validation.ts` - Update input schema
3. `quotation.types.ts` - Update input types
4. `quotation.repository.ts` - Verify migration logic
5. `quotation.service.test.ts` - Update test expectations

**Changes:**
- Remove support for creating new quotations with `leadId`
- Keep `leadId` support ONLY for pre-conversion quotations
- Update validation messages
- Maintain automatic Lead Service status sync via `resolveSourceLeadId()`

### Phase 2: Lead Module Updates
**Goal:** Make Lead Services read-only after conversion, keep auto-sync

**Files to modify:**
1. `lead.service.ts` - Add conversion check before status updates
2. `lead.repository.ts` - Add helper methods
3. `lead.service.test.ts` - Update tests

**Changes:**
- Block manual Lead Service status updates after conversion
- KEEP automatic status updates from quotation/project events
- Update error messages

### Phase 3: Client Module Verification
**Goal:** Ensure conversion and migration work correctly

**Files to verify:**
1. `client.service.ts` - Already correct
2. `client.repository.ts` - Already correct
3. `client.controller.ts` - Already correct

**No changes needed** - Client module already implements correct workflow

### Phase 4: Project Module Verification
**Goal:** Ensure projects are Client-only

**Files to verify:**
1. `project.service.ts` - Verify Client ownership
2. `project.repository.ts` - Verify queries
3. `project.types.ts` - Verify input types

**Expected:** Projects already use Client ownership, verify no issues

### Phase 5: Frontend Updates
**Goal:** Update UI to match backend workflow

**Files to modify:**
1. `QuotationFormDrawer.tsx` - Remove Lead selection
2. `LeadDetailPage.tsx` - Update conversion dialog
3. `LeadServicesPanel.tsx` - Show read-only after conversion

**Changes:**
- Quotation form shows "Convert to Client first" for unconverted Leads
- Lead detail shows status as read-only after conversion
- Clear messaging about workflow

### Phase 6: Testing & Verification
**Goal:** Verify complete end-to-end workflow

**Test scenarios:**
1. ✓ Lead creation → conversion → quotation → acceptance → project
2. ✓ Pre-conversion quotations migrate correctly
3. ✓ Lead Services update automatically after conversion
4. ✓ Manual Lead Service updates blocked after conversion
5. ✓ Timeline and Audit Log remain intact
6. ✓ Notifications work correctly
7. ✓ Client Portal shows quotations correctly

---

## DETAILED CHANGES

### 1. quotation.service.ts

**Current state:**
```typescript
async create(input: CreateQuotationInput, actorUserId: string) {
  if (!input.leadId && !input.clientId) {
    throw new ValidationError('Either leadId or clientId is required');
  }
  // ... supports both Lead and Client
}
```

**New state:**
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

**Keep `resolveSourceLeadId()` for automatic status sync**

### 2. lead.service.ts - updateLeadServiceStatus()

**Add conversion check:**
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

**Keep `applyQuotationWorkflowStatus()` unchanged** - this handles automatic updates

### 3. quotation.validation.ts

**Update schema:**
```typescript
export const createQuotationSchema = z.object({
  clientId: z.string().uuid('Client ID must be valid'), // REQUIRED
  leadId: z.string().uuid().optional().nullable(), // REMOVED or optional for backward compat
  items: z.array(quotationItemSchema).min(1),
  discount: z.number().optional(),
  transportation: z.number().optional(),
  installation: z.number().optional(),
});
```

---

## FILES REQUIRING CHANGES

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

### Documentation (3 files)
11. ✏️ Update `PRD-Business-Service-Management-Platform-V1.md`
12. ✏️ Update `Technical-Blueprint-Development-Roadmap-V1.md`
13. ✏️ Create migration guide

---

## BACKWARD COMPATIBILITY

### Existing quotations with `leadId`
- ✅ Keep support for reading/displaying
- ✅ Migration already handles conversion
- ✅ No data loss

### Existing APIs
- ⚠️ Breaking change: POST /api/quotations with `leadId` will be rejected
- ✅ GET endpoints remain compatible
- ✅ All other endpoints unaffected

---

## MIGRATION NOTES

### For existing data:
1. Quotations with `leadId` (unconverted Leads): Leave as-is
2. Quotations with `leadId` (converted Leads): Already migrated to `clientId`
3. Lead Services: Continue functioning with automatic updates

### For new operations:
1. All new quotations MUST have `clientId`
2. Lead conversion MUST happen before quotation creation
3. Lead Service manual updates blocked after conversion

---

## TESTING CHECKLIST

### Backend Tests
- [ ] Quotation creation requires clientId
- [ ] Quotation creation rejects unconverted Leads
- [ ] Lead Service manual update blocked after conversion
- [ ] Lead Service automatic update works after conversion
- [ ] Client conversion works correctly
- [ ] Quotation migration works correctly
- [ ] Project creation works correctly

### Frontend Tests
- [ ] Quotation form shows Client selection only
- [ ] Quotation form shows "Convert first" message
- [ ] Lead detail shows conversion button
- [ ] Lead Services show read-only after conversion
- [ ] Client portal displays quotations correctly

### Integration Tests
- [ ] End-to-end: Lead → Convert → Quotation → Accept → Project
- [ ] Timeline entries created correctly
- [ ] Audit logs recorded correctly
- [ ] Notifications sent correctly
- [ ] Email sent to Client after quotation send

---

## ROLLBACK PLAN

If issues arise:
1. Revert backend changes (git revert)
2. Database rollback not needed (no schema changes)
3. Frontend can stay as-is (graceful degradation)

---

**STATUS: READY TO IMPLEMENT**
**NEXT: Start with Phase 1 - Quotation Module**
