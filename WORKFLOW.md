# WORKFLOW - Complete Business Process

**Date:** 2026-07-19  
**Status:** IMPLEMENTATION COMPLETE

---

## Overview

This document describes the complete business workflow implemented in the Nexus platform, from initial Lead capture through Project completion and invoicing.

---

## Complete Workflow Diagram

```
Lead (NEW)
  ↓
CONTACTED
  ↓
QUALIFIED
  ↓
SITE_VISIT (if required)
  ↓
QUOTE_PREPARING
  ↓
Admin converts Lead → Client
  ↓
Client account created, credentials emailed
  ↓
Admin creates quotation for Client only
  ↓
Admin approves quotation
  ↓
Admin sends quotation
  ↓
Lead Service status automatically → QUOTE_SENT
  ↓
Client requests revision
  → Lead Service → NEGOTIATION
  ↓
Admin revises & sends again
  → Lead Service → QUOTE_SENT
  ↓
Client accepts quotation
  → Lead Service → APPROVED
  ↓
Project automatically created
  → Lead Service → PROJECT_CREATED
  ↓
Project Module
  → PROJECT_CREATED
  → IN_PROGRESS
  → ON_HOLD
  → COMPLETED
  → CANCELLED
```

---

## Lead Lifecycle

### Lead Stages
1. **NEW** - Initial enquiry received
2. **CONTACTED** - Admin makes first contact
3. **QUALIFIED** - Lead is valid, has budget/intent
4. **SITE_VISIT** - If required by service
5. **QUOTE_PREPARING** - Admin is preparing quotation

### Lead Conversion Requirements
- At least one service past CONTACTED stage
- Valid email for Client login
- Complete business data

### Lead After Conversion
- **Read-only** for manual status updates
- **Automatic updates** continue from quotation/project events
- **Historical record** preserved for traceability

### Lead Archiving
- **Only unconverted Leads** can be archived
- **Mandatory reason** required for audit trail
- **Archived Leads** are excluded from:
  - Dashboard counts and statistics
  - Global search results
  - Active leads list
- **Archived Leads** can be viewed via the "Archived" tab on the Leads page
- **Restore** is available to move a Lead back to active status
- **Timeline entries** recorded for both archive and restore actions
- **Audit log** entries created with before/after state snapshots

---

## Client Lifecycle

### Client Creation
- Triggered by Lead conversion
- Account created with credentials
- Credentials emailed to Client
- `sourceLeadId` set for historical traceability

### Client Portal Access
- Client can log in after conversion
- Client can view quotations
- Client can accept/reject quotations
- Client can view projects

---

## Quotation Lifecycle

### Quotation Creation
- **Owner**: Client (required)
- **Items**: Multiple services with unlimited line items
- **Totals**: Server-calculated (subtotal, discount, transportation, installation, GST, total)

### Quotation Workflow
1. **DRAFT** - Created by Admin
2. **APPROVED** - Admin approves internally
3. **SENT** - Admin sends to Client (email sent)
4. **ACCEPTED** - Client accepts in portal
5. **REJECTED** - Client rejects in portal

### Quotation Status Transitions
```
DRAFT → APPROVED (Admin approves)
APPROVED → SENT (Admin sends)
SENT → ACCEPTED (Client accepts)
SENT → REJECTED (Client rejects)
REJECTED → DRAFT (Admin revises)
```

### Quotation Revision
- Client can request revision
- Quotation moves to NEGOTIATION status
- Admin revises and resends
- Cycle repeats until acceptance

---

## Project Lifecycle

### Project Creation
- **Trigger**: Quotation acceptance
- **Owner**: Client
- **Services**: Created from Quotation items
- **Status**: PROJECT_CREATED (automatic)

### Project Stages
1. **PROJECT_CREATED** - Automatic on creation
2. **IN_PROGRESS** - Work has begun
3. **ON_HOLD** - Paused (if needed)
4. **COMPLETED** - Work finished
5. **CANCELLED** - Project cancelled

### Project Status Updates
- **Manual**: Admin can update status
- **Automatic**: None (unlike Lead Services)

---

## Invoice Lifecycle

### Invoice Creation
- **Owner**: Project
- **Items**: Based on Project Services
- **Numbering**: Gapless sequential under concurrency

### Invoice Workflow
1. **DRAFT** - Created by Admin
2. **SENT** - Sent to Client
3. **PAID** - Payment received
4. **OVERDUE** - Payment late

---

## Automatic Status Transitions

### Lead Service Statuses (After Conversion)

| Event | Status | Implementation |
|-------|--------|----------------|
| Admin sends quotation | QUOTE_SENT | `quotationService.send()` |
| Client rejects quotation | NEGOTIATION | `quotationService.reject()` |
| Admin re-sends quotation | QUOTE_SENT | `quotationService.send()` |
| Client accepts quotation | APPROVED | `quotationService.accept()` |
| Project created | PROJECT_CREATED | `projectService.create()` |

### How Automatic Updates Work
1. Quotation events trigger `applyQuotationWorkflowStatus()`
2. System resolves Lead via `Client.sourceLeadId`
3. Lead Services updated automatically
4. No manual intervention required

---

## Manual Status Transitions

### Lead Pipeline (Pre-Conversion Only)
- NEW
- CONTACTED
- QUALIFIED
- SITE_VISIT
- QUOTE_PREPARING

### Project Pipeline
- PROJECT_CREATED
- IN_PROGRESS
- ON_HOLD
- COMPLETED
- CANCELLED

---

## Validation Rules

### Lead Conversion
- ✅ Requires: At least one service past CONTACTED stage
- ✅ Requires: Valid email for Client login
- ❌ Does NOT require: APPROVED status
- ❌ Does NOT require: Existing quotation

### Quotation Creation
- ✅ Requires: Client ID (not Lead ID)
- ✅ Rejects: Attempts to create for unconverted Leads
- ✅ Message: "Quotations must be created for Clients. Convert the Lead to a Client first."

### Quotation Sending
- ✅ Requires: Status = APPROVED
- ✅ Requires: Client email exists
- ✅ Sends: Email to Client with portal link

### Client Acceptance
- ✅ Requires: Status = SENT
- ✅ Requires: Client is logged in
- ✅ Triggers: Project creation automatically
- ✅ Updates: Quotation status to ACCEPTED

### Project Creation
- ✅ Requires: Quotation status = ACCEPTED
- ✅ Creates: Project Services from Quotation items
- ✅ Links: Project to Client (not Lead)
- ✅ Keeps: Client.sourceLeadId for historical traceability

---

## Timeline & Audit Log

### Timeline Entries
- Lead created
- Lead status changes
- Lead converted to Client
- **Lead archived**
- **Lead restored**
- Quotation created
- Quotation approved
- Quotation sent
- Quotation accepted/rejected
- Project created
- Project status changes
- Invoice created/sent/paid

### Audit Log
- All CRUD operations
- Status transitions
- **Archive/restore actions with before/after state**
- User actions
- Timestamps and actor information

---

## Notifications

### Email Notifications
- Client credentials (on conversion)
- Quotation sent to Client
- Quotation accepted by Client
- Invoice sent to Client

### In-App Notifications
- Lead status changes
- Quotation events
- Project updates
- Invoice events

---

## Client Portal

### Client Capabilities
- View quotations
- Accept/reject quotations
- Request quotation revisions
- View projects
- View invoices
- Download documents

### Portal Access
- Requires login
- Client-specific data only
- Real-time updates

---

## Edge Cases

### Pre-Conversion Quotations
- If quotations exist before conversion
- Migrated to Client on conversion
- `leadId` preserved for backward compatibility

### Converted Leads
- Cannot create new quotations
- Lead Services read-only
- Automatic updates continue

### Archived Leads
- Cannot be archived if already converted
- Cannot be archived if already archived
- Dashboard excludes archived leads from counts
- Search excludes archived leads by default
- Can be restored to active status at any time

### Global Search
- Backend performs all filtering — no client-side fetch-and-filter
- Searches across 7 modules: Leads, Clients, Projects, Quotations, Invoices, Services, Documents
- `GET /api/search?q=...&type=...` — optional module filter
- Related entity data included (client name, project number, category)
- 3-character minimum query length
- Cmd+K opens CommandPalette for instant search
- Search page provides module filter tabs with text highlighting

### Multiple Quotations
- Client can have multiple quotations
- Each quotation can create separate project
- Independent status tracking

---

## Integration Points

### Timeline Integration
- All workflow events create timeline entries
- Chronological history preserved
- Filterable by entity type

### Audit Log Integration
- All operations logged
- Actor identification
- Before/after values

### Notification Integration
- Email delivery on key events
- In-app notifications
- Configurable preferences

### Portal Integration
- Real-time data sync
- Client-specific views
- Secure access control

---

## Data Flow Summary

```
Lead → Client (conversion)
Client → Quotation (ownership)
Quotation → Project (acceptance)
Project → Invoice (creation)
Lead ← Quotation (automatic status sync via sourceLeadId)
```

---

## Key Implementation Notes

1. **Quotations are Client-owned only** - No Lead quotations after conversion
2. **Converted Leads cannot create new quotations** - Must use Client
3. **Client.sourceLeadId** - Historical traceability and automatic sync only
4. **Lead Services read-only after conversion** - Manual updates blocked
5. **Automatic status updates preserved** - From quotation/project events
6. **Project execution statuses** - Belong only to Project module
7. **Timeline, Audit Log, Notifications, Portal** - Remain synchronized
8. **Lead Archiving** - Soft archive with mandatory reason, excludes from dashboard/search, fully reversible
9. **Global Search** - Backend-first architecture, type filtering, related entity includes, Cmd+K integration

---

## Conclusion

The Nexus platform implements a clear, single-path workflow from Lead capture through Project completion. The "Convert First" approach ensures clean ownership semantics, eliminates contradictory business logic, and provides a seamless experience for both Admins and Clients.

**Status**: ✅ WORKFLOW IMPLEMENTATION COMPLETE  
**Builds**: Backend ✓ | Frontend ✓  
**Tests**: Passing ✓
