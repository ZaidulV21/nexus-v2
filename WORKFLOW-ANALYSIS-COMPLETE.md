# COMPLETE WORKFLOW ANALYSIS - DO NOT CODE YET
**Date:** 2026-07-19
**Status:** ANALYSIS PHASE - NO CODE CHANGES YET

---

## CRITICAL FINDING FROM PRD

### PRD Section 10: Client Account Provisioning

> "A Lead's contact remains a Lead until the Admin explicitly decides to convert them — **normally at the point a quotation is accepted and the Project is officially created.**"

### PRD Section 7: Quotations

> "One Quotation may include multiple services and unlimited line items..."
> **No mention of whether quotations belong to Leads or Clients**

### PRD Section 4.3: Project → Project Services

> "When a Lead converts, it becomes a Project..."

---

## THE AMBIGUITY IN THE PRD

The PRD says:
1. Conversion happens "**normally at the point a quotation is accepted**"
2. But it doesn't explicitly state whether:
   - Quotations are created for Leads BEFORE conversion, OR
   - Clients are converted BEFORE quotations are created

This ambiguity led to the dual-workflow implementation.

---

## CURRENT BACKEND IMPLEMENTATION ANALYSIS

### What the code currently supports:

#### Path A: Quotation for Lead → Convert → Client inherits quotation
```typescript
// quotation.service.ts lines 100-108
else {
  const lead = await leadRepository.findById(input.leadId!);
  if (!lead) throw new NotFoundError('Lead not found');
  if (lead.convertedAt) {
    throw new ValidationError(
      'This Lead has been converted to a Client - create the quotation against the Client instead'
    );
  }
}
```
✅ **Quotations CAN be created for Leads**
✅ **But ONLY if the Lead has NOT been converted yet**

#### Path B: Convert Lead → Client → Quotation for Client
```typescript
// client.service.ts lines 78-80
// Migrate all Lead quotations to the newly-created Client. Quotations
// start with leadId; after conversion, they carry clientId instead.
const migration = await quotationRepository.migrateLeadQuotationsToClient(lead.id, created.id, tx);
```
✅ **Conversion automatically migrates any existing Lead quotations to the Client**

---

## THE CONTRADICTION

The current code says:

1. **"You can create quotations for Leads"** (quotation.service.ts:100-108)
2. **"After conversion, create quotations for Clients only"** (same validation)
3. **"We'll migrate Lead quotations to Client on conversion"** (client.service.ts:80)

BUT...

Later in the workflow:

```typescript
// quotation.service.ts:77-82
function resolveSourceLeadId(quotation: any): string {
  if (quotation.leadId) return quotation.leadId;
  if (quotation.client?.sourceLeadId) return quotation.client.sourceLeadId;
  if (quotation.lead?.id) return quotation.lead.id;
  throw new ValidationError('Quotation has no linked Lead');
}
```

This function expects quotations to ALWAYS be traceable to a Lead, even after conversion.

**This creates the error**: *"Quotation has no linked Lead"* when a quotation is created directly for a Client.

---

## THE DEADLOCK THAT WAS "FIXED"

### Original Issue:
- Lead conversion required `APPROVED` status
- `APPROVED` status comes from accepting a quotation
- Quotations needed a Client to accept them
- But the Client didn't exist yet

### My "Fix":
- Changed conversion to require only `QUALIFIED` status (not `APPROVED`)
- This allowed conversion to happen earlier

### But This Created a New Problem:
- Now both workflows are semi-broken:
  - **Path A** (Quote Lead → Convert): Quotation gets migrated, but some functions still expect `leadId`
  - **Path B** (Convert → Quote Client): Quotation has `clientId` but no `leadId`, causing "no linked Lead" errors

---

## ROOT CAUSE ANALYSIS

The system was designed with **BOTH workflows in mind**, but:

1. **Database schema** supports both (quotations table has `leadId` OR `clientId`)
2. **Some backend functions** expect quotations to always have a `leadId` (via Lead directly or via Client.sourceLeadId)
3. **Other backend functions** prevent creating quotations for converted Leads
4. **Migration logic** moves quotations from Lead to Client
5. **Lead status automation** expects to update Lead Services based on quotation events

**Result:** A half-implemented dual-workflow that creates contradictions.

---

## BUSINESS LOGIC QUESTIONS TO ANSWER

Before implementing a single workflow, I need to understand:

### Question 1: When should conversion happen?

**Option A:** Convert AFTER quotation is accepted
- PRD says "normally at the point a quotation is accepted"
- Means: Lead → Quote → Accept → Convert → Project
- Problem: How does Client accept if they don't have login?

**Option B:** Convert BEFORE quotation is created  
- Makes sense for Client Portal (Client needs login to view/accept)
- Means: Lead → Convert → Quote → Accept → Project
- Problem: Contradicts PRD's "normally at acceptance" language

### Question 2: What about Lead Service status automation?

Currently, the code automatically updates Lead Service statuses when:
- Quotation is sent → `QUOTE_SENT`
- Quotation is rejected → `NEGOTIATION`
- Quotation is accepted → `APPROVED`
- Project is created → `PROJECT_CREATED`

If quotations belong to Clients (after conversion), how do we update Lead Service statuses?

**Current approach**: Use `resolveSourceLeadId()` to trace Client back to Lead
**Problem**: This requires quotations to always be linked to a Lead somehow

### Question 3: Should Lead Services exist after conversion?

**Currently**: Lead Services remain as "historical sales record" after conversion
**Problem**: If we're still updating their statuses after conversion, they're not just historical

---

## PROPOSED SINGLE WORKFLOW (Option B - Client Portal Focused)

```
Lead created (NEW)
  ↓
Lead progresses through sales stages:
  - CONTACTED
  - QUALIFIED  
  - SITE_VISIT (optional)
  - QUOTE_PREPARING
  ↓
Admin clicks "Convert to Client"
  ✓ Conversion validation: At least one service past CONTACTED stage
  ✓ Client account created
  ✓ Credentials emailed
  ✓ Lead marked as convertedAt = now
  ✓ Lead Services frozen as historical data
  ✓ Any existing Lead quotations migrated to Client
  ↓
Admin creates Quotation (Client-owned only)
  ✓ Quotation.clientId = client.id
  ✓ Quotation.leadId = null
  ✓ Services from Lead are referenced for quotation items
  ↓
Admin approves Quotation internally
  ✓ Status: DRAFT → APPROVED
  ↓
Admin sends Quotation
  ✓ Status: APPROVED → SENT
  ✓ Email sent to Client
  ↓
Client logs into Portal
  ↓
Client views Quotation
  ↓
Client either:
  A) Accepts → Status: ACCEPTED
     → Project automatically created
     → Project Services created from Quotation
  B) Rejects → Status: NEGOTIATION
     → Admin revises
     → Status: DRAFT
     → Repeat approval/send cycle
  ↓
Project workflow begins
  - PROJECT_CREATED
  - IN_PROGRESS
  - ON_HOLD
  - COMPLETED
  ↓
Invoices created against Project
```

---

## CHANGES REQUIRED FOR SINGLE WORKFLOW

### 1. Database Schema
- ✅ No changes needed (supports both `leadId` and `clientId`)
- ✅ After conversion, quotations should have `clientId` only

### 2. Lead Service Status Automation
**REMOVE**: Automatic updates to Lead Service statuses after conversion
**REASON**: Lead Services are frozen historical data after conversion

**KEEP**: Lead Service status automation BEFORE conversion only

### 3. Quotation Creation Validation
**CHANGE**: `quotation.service.ts` create() method
```typescript
// OLD: Allow leadId OR clientId
// NEW: Require clientId only, reject if Lead not converted

if (!input.clientId) {
  throw new ValidationError('Quotations must be created for Clients. Convert the Lead first.');
}
```

### 4. Remove `resolveSourceLeadId()` function
**REASON**: Quotations should not need to trace back to Lead for workflow automation
**IMPACT**: This will break Lead Service status updates - which we're removing anyway

### 5. Project Creation
**CHANGE**: Projects link to Client, not Lead
**KEEP**: `sourceLeadId` on Client for historical traceability only

### 6. Quotation Migration
**KEEP**: Automatic migration of Lead quotations to Client on conversion
**USE CASE**: Edge case where quotations were drafted before conversion decision

### 7. Frontend UI
**CHANGE**: Quotation creation form
- Remove "Lead" selection
- Show only "Client" selection
- If user tries to create quotation for unconverted Lead, show: "Convert this Lead to a Client first"

**CHANGE**: Lead detail page
- Show "Convert to Client" button when qualified
- After conversion, Lead Services show as "Archived - Historical Data"
- Remove status update buttons for converted Leads

---

## MIGRATION STRATEGY FOR EXISTING DATA

### Scenario 1: Existing quotations with `leadId` (no `clientId`)
These are quotations created for Leads that were never converted.

**Migration**:
- If the Lead is now converted: Update quotation to use `clientId` from the Client
- If the Lead is not converted: Leave as-is (will be migrated on conversion)

### Scenario 2: Lead Services with status updates after conversion
These exist if the old workflow was used.

**No migration needed**: Historical data remains as-is.
**Future**: No more status updates after conversion.

---

## VALIDATION RULES - SINGLE SOURCE OF TRUTH

### Lead Conversion
✅ Requires: At least one service past CONTACTED stage  
✅ Requires: Valid email for Client login  
❌ Does NOT require: APPROVED status  
❌ Does NOT require: Existing quotation

### Quotation Creation
✅ Requires: Client ID (not Lead ID)  
✅ Rejects: Attempts to create for unconverted Leads  
✅ Message: "Convert this Lead to a Client before creating quotations"

### Quotation Sending
✅ Requires: Status = APPROVED  
✅ Requires: Client email exists  
✅ Sends: Email to Client with portal link

### Client Acceptance
✅ Requires: Status = SENT  
✅ Requires: Client is logged in  
✅ Triggers: Project creation automatically  
✅ Updates: Quotation status to ACCEPTED

### Project Creation
✅ Requires: Quotation status = ACCEPTED  
✅ Creates: Project Services from Quotation items  
✅ Links: Project to Client (not Lead)  
✅ Keeps: Client.sourceLeadId for historical traceability

---

## FILES THAT NEED CHANGES

### Backend Services
1. ✏️ `quotation.service.ts` - Remove Lead quotation creation, simplify ownership
2. ✏️ `lead.service.ts` - Remove post-conversion status updates
3. ✏️ `project.service.ts` - Verify Client-only ownership
4. ✏️ `client.service.ts` - Already correct, may need comments updated
5. ✏️ `invoice.service.ts` - Verify no Lead dependencies

### Backend Repositories
6. ✏️ `quotation.repository.ts` - Review migration and ownership queries
7. ✏️ `lead.repository.ts` - Add conversion finality checks

### Backend Validation
8. ✏️ `quotation.validation.ts` - Update input schemas

### Frontend Components
9. ✏️ `QuotationFormDrawer.tsx` - Remove Lead selection, Client-only
10. ✏️ `LeadDetailPage.tsx` - Update conversion dialog description
11. ✏️ `LeadServicesPanel.tsx` - Show archived state after conversion

### Documentation
12. ✏️ Update PRD to clarify single workflow
13. ✏️ Update Technical Blueprint
14. ✏️ Create migration guide

---

## NEXT STEPS (AFTER APPROVAL)

1. ✅ **Get user approval** of this analysis and proposed workflow
2. Create detailed implementation plan with file-by-file changes
3. Implement backend changes first
4. Update frontend to match
5. Write migration script for existing data
6. Update all documentation
7. Test end-to-end workflow
8. Verify no contradictions remain

---

## DECISION REQUIRED

**Should I proceed with implementing the "Convert First" workflow?**

This means:
- ✅ Lead → Convert to Client → Create Quotation → Accept → Project
- ❌ Lead → Create Quotation → Convert to Client (no longer supported)
- ⚠️ Breaking change for any existing code expecting Lead quotations
- ⚠️ Requires frontend updates to match

**Alternative**: Keep dual workflow but fix the contradictions
- More complex
- Harder to maintain
- Contradictions may resurface

---

**STATUS: AWAITING DECISION BEFORE PROCEEDING WITH CODE CHANGES**
