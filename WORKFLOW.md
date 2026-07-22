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
Client account created
  ↓ Welcome email sent via Resend (credentials + portal link)
Admin creates quotation for Client only
  ↓
Admin approves quotation
  ↓
Admin sends quotation → Email sent via Resend (branded, with totals breakdown)
  ↓
Lead Service status automatically → QUOTE_SENT
  ↓
Client views quotation in portal (PDF as single source of truth)
  ↓
Client requests revision
  → Lead Service → NEGOTIATION
  ↓
Admin revises & sends again → Revised quotation email via Resend
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
  ↓
Invoice created → Invoice email sent via Resend
  ↓
Payment recorded → Payment receipt email sent via Resend
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

### Admin Dashboard
- **Real-time overview** of business performance on the `/` route
- **10 KPI cards**: Active Projects, Total Leads, Clients, Quotations, Invoices, Revenue Invoiced, Revenue Received, Outstanding, Pending Quotations, Projects In Progress
- **Month-over-month comparison** on KPI cards (leads, clients, quotations, projects, invoices)
- **4 Charts**: Lead Services by Status (bar), Leads by Source (donut), Monthly Revenue (grouped bar — invoiced vs received), Projects by Status (donut)
- **Recent Activity**: Latest 10 timeline events with icons, descriptions, timestamps, and clickable links to related entities
- **Upcoming Items**: Pending Quotations, Projects On Hold, Overdue Invoices, Invoices Awaiting Payment, Unread Notifications
- **Quick Actions**: Create/view shortcuts for Leads, Quotations, Invoices, Projects, Clients
- **Search Shortcut**: Ctrl+K hint to trigger global search
- **Notifications Summary**: Unread count with "View all" link
- **Empty states** shown when database has no data
- **Archived Leads excluded** from all counts and statistics
- **All queries use aggregates** — no full-table scans, no N+1 queries

---

## Client Lifecycle

### Client Creation
- Triggered by Lead conversion
- Account created with credentials
- **Welcome email sent via Resend** with portal login credentials (email + temporary password) and portal URL
- `sourceLeadId` set for historical traceability
- `clientName` included in notification payload for personalized email

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
3. **SENT** - Admin sends to Client (**branded email via Resend** with subtotal/GST/grand total breakdown, portal link)
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
- Admin revises and resends — **"Revised Quotation" email sent via Resend**
- Cycle repeats until acceptance

### Quotation Lead Display (XOR Constraint)
- Database enforces `CHECK (("leadId" IS NULL) <> ("clientId" IS NULL))` — a quotation belongs to either a Lead OR a Client, never both
- **Before conversion**: `leadId` is set, `clientId = NULL` — lead displayed via `quotation.lead`
- **After conversion**: `leadId = NULL`, `clientId` is set — lead displayed via `quotation.client.sourceLead`
- The original lead is always visible through the existing `Client.sourceLead` Prisma relation
- Lead number remains clickable to Lead Detail page in all views (admin detail, admin list, portal detail, portal list)
- **No additional API requests** — lead data is fetched as a nested include in the quotation response

### Quotation Service Name Display
- Each quotation item belongs to a Service from the catalog
- `serviceName` is a denormalized snapshot stored on `QuotationItem` — populated at creation/revision time
- **Creation time**: `enrichItemsWithServiceNames()` batch-fetches Service names from catalog and writes them to the DB
- **Read time**: `enrichItemsWithServiceNames()` fills `serviceName` for older items where it is NULL (backward compatibility)
- **PDF**: Service column shows `serviceName` for each item row
- **Email**: Service names shown as a summary line (e.g., "Services: Solar Installation · CCTV Installation")
- **Admin detail**: Items grouped by service with uppercase headings
- **Portal**: Same grouping visible in the PDF rendered in the iframe

### Quotation PDF Generation
- **Trigger**: Fire-and-forget after `create`, `revise`, `approve`, `send`, `requestRevision`, `accept`, `reject`
- **Process**: Fetches company branding → Downloads images (logo, QR, signature, stamp) → Generates PDF buffer → Uploads to storage (Cloudinary/localStorage) → Stores `pdfUrl`/`pdfGeneratedAt` on Quotation record
- **Content**: Header with logo/company details, document info with version/date/status/valid until, recipient block with GSTIN, 6-column services table (Description, Service, Qty, Rate, Tax %, Amount), amount in words, summary with GST breakdown, notes/terms & conditions/payment terms sections, bank details, signature/stamp, footer with page numbers
- **Watermarks**: DRAFT and REJECTED statuses render diagonal rotated watermark overlay on every page
- **Timeline**: Records `QUOTATION_PDF_GENERATED` on generation, `QUOTATION_PDF_DOWNLOADED` on download
- **Error handling**: PDF failures are silently caught (`.catch(() => {})`) — never block the main workflow
- **Download**: `GET /api/pdf/QUOTATION/:quotationId` — returns PDF URL; records `PDF_DOWNLOADED` timeline event
- **Regenerate**: `POST /api/pdf/QUOTATION/:quotationId/regenerate` — forces regeneration even if PDF exists
- **Frontend**: Preview (opens in new tab), Download (via `<a download>`), Regenerate (button with toast feedback) on QuotationDetailPage

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
1. **DRAFT** - Created by Admin (no payments, not yet sent)
2. **SENT** - Sent to Client (ISSUED status, no payments yet)
3. **PARTIALLY PAID** - Some payments recorded, outstanding balance remains
4. **PAID** - Fully paid (outstanding balance = 0)
5. **OVERDUE** - Payment late (reserved for future due date support)
6. **CANCELLED** - Invoice cancelled by Admin

**Note**: Status is auto-calculated from payment state. No manual status editing allowed.

### Payment Recording
- **Full Payment**: Single payment covers entire grand total
- **Partial Payment**: Payment less than grand total, multiple allowed
- **Business Rules**: Rejects negative, zero, overpayment, and duplicate transaction references
- **Fields**: Amount, Method, Transaction/UTR Reference, Notes, Recorded By

### Invoice PDF Generation
- **Trigger**: Fire-and-forget after `create`, `send`, `cancel`, `recordPayment`
- **Process**: Same as Quotation PDF — fetches branding → downloads images → generates buffer → uploads → stores URL
- **Bill To block**: Shows client contact name, company name, GSTIN, email, phone
- **HSN/SAC codes**: Shown in 6-column table (Description, Qty, HSN/SAC, Rate, Tax %, Amount) when present
- **Payment summary**: Subtotal, GST, Grand Total, Amount Paid, Outstanding, Payment Count
- **Auto-calculated status**: DRAFT → SENT → PARTIALLY PAID → PAID → CANCELLED (never stored, always computed)
- **Status watermarks**: CANCELLED (red), PAID (green), PARTIALLY PAID (amber), SENT (blue)
- **Bank details + signature/stamp**: From company branding
- **Download**: `GET /api/pdf/INVOICE/:invoiceId` — returns redirect to storage URL
- **Regenerate**: `POST /api/pdf/INVOICE/:invoiceId/regenerate` — forces regeneration
- **Frontend**: Preview PDF, Download PDF, Regenerate PDF buttons on InvoiceDetailPage

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

### Email Notifications (via Resend)
- **Client welcome** — portal credentials (email + temp password) on Lead → Client conversion
- **Quotation sent** — branded email with subtotal/GST/grand total breakdown and portal link
- **Quotation resent** — "Revised Quotation" variant with same breakdown
- **Invoice sent** — branded email with grand total, outstanding amount, and portal link
- **Invoice reminder** — "Invoice Reminder" variant
- **Payment receipt** — confirmation with amount paid, payment date/method

**Email infrastructure**: Resend SDK (`resend` npm package), centralized `EmailService`, 5 HTML templates (base, client-welcome, quotation-sent, invoice-sent, payment-receipt), company branding from `CompanySetting` → `getCompanyBranding()`. Graceful degradation: missing `RESEND_API_KEY` → emails skipped, not errors.

### In-App Notifications
- Lead status changes
- Quotation events
- Project updates
- Invoice events
- Payment receipt sent

---

## Client Portal

### Client Capabilities
- View quotations (PDF as single source of truth, originating lead displayed)
- Accept/reject quotations
- Request quotation revisions
- View projects
- View invoices (payment summary + payment history)
- Download documents
- Receive email notifications (welcome, quotation sent, invoice sent, payment receipt)

### Portal Access
- Requires login
- Client-specific data only
- Real-time updates

---

## Edge Cases

### Pre-Conversion Quotations
- If quotations exist before conversion
- Migrated to Client on conversion (`leadId → NULL, clientId → client.id`)
- `leadId` set to `NULL` — enforced by XOR constraint
- Lead still accessible via `Client.sourceLead` for display purposes

### Converted Leads
- Cannot create new quotations
- Lead Services read-only
- Automatic updates continue

### Archived Leads
- Cannot be archived if already converted
- Cannot be archived if already archived
- Dashboard excludes archived leads from counts, charts, and KPI cards
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

### Notification Center
- Notifications are generated automatically by business events — NOT duplicating Timeline or Audit Log
- Timeline = history of an entity; Audit Log = system changes; Notifications = items requiring user attention
- Admin notifications (17 event types) sent to ALL active admin users
- Client notifications (9 event types) sent to specific client via `clientId` in payload
- 4 notification types: INFO, SUCCESS, WARNING, ERROR
- 4 priority levels: LOW, NORMAL, HIGH, URGENT
- `emitEvent()` creates in-app notifications (fire-and-forget, never blocks business transaction)
- API: `GET /api/notifications` (paginated), `GET /api/notifications/unread-count`, `PATCH /api/notifications/read-all`, `PATCH /api/notifications/:id/read`
- Frontend: Bell icon with unread badge (30s polling), dropdown preview, full page with All/Unread/Read filters

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
- Email delivery via **Resend** on key events (welcome, quotation sent, invoice sent, payment receipt)
- In-app notifications for all 18+ event types
- Company branding (name, logo, address, support email) injected into every email
- Configurable via `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` environment variables

### Company Settings Integration
- Centralized company profile, branding, and business configuration — **single source of truth**
- Single `CompanySetting` record (singleton pattern)
- Admin-only edit access; all authenticated users can read
- Every update creates Timeline and Audit Log entries
- File uploads via **Cloudinary** (logo, favicon, QR code, signature, stamp) — falls back to local storage when `CLOUDINARY_*` env vars are not set
- Settings available via `GET /api/company/settings` for all consumers
- **Branding helper** (`getCompanyBranding()` + `clearBrandingCache()`) for downstream consumers (PDF generation, emails, invoices, quotations)
- **PDF Generation**: `POST /api/pdf/generate`, `GET /api/pdf/:documentType/:documentId`, `POST /api/pdf/:documentType/:documentId/regenerate` — Professional branded PDFs for Quotations and Invoices with company logo, address, GST, bank details, signature, and stamp
- **Email Integration**: Company branding (name, logo, support email, address) injected into all Resend emails via `getCompanyBranding()`
- **Frontend consumers**: Admin sidebar (logo + name), Login page (logo + name), Client portal header (logo + name), Settings page (company profile summary card), Browser favicon (dynamic from settings.faviconUrl)
- Frontend: Sectioned card layout at `/settings/company` with unsaved changes protection

### Portal Integration
- Real-time data sync
- Client-specific views
- Secure access control

---

## Data Flow Summary

```
Lead → Client (conversion, welcome email via Resend)
Client → Quotation (ownership, XOR constraint: leadId OR clientId)
Quotation → Project (acceptance)
Project → Invoice (creation, invoice email via Resend)
Invoice → Payment (recording, receipt email via Resend)
Lead ← Quotation (automatic status sync via sourceLeadId)
Lead ← Quotation.client.sourceLead (display resolution for converted quotations)
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
10. **Payment Management** - Auto-calculated invoice status, transaction references, duplicate prevention, sorted payment history
11. **Email Delivery** - Production Resend integration with branded HTML templates, company branding from single source, graceful degradation
12. **Lead Display** - Client-owned quotations show originating lead via `Client.sourceLead` relation — no schema or constraint changes
13. **Service Name Display** - Quotation items show their associated service name via denormalized `serviceName` snapshot — populated at creation time, enriched at read time for backward compatibility

---

## Conclusion

The Nexus platform implements a clear, single-path workflow from Lead capture through Project completion. The "Convert First" approach ensures clean ownership semantics, eliminates contradictory business logic, and provides a seamless experience for both Admins and Clients.

**Status**: ✅ WORKFLOW IMPLEMENTATION COMPLETE  
**Builds**: Backend ✓ | Frontend ✓  
**Tests**: Passing ✓
 