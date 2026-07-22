# IMPLEMENTATION - Single Workflow (Convert First)

**Date:** 2026-07-19  
**Status:** IMPLEMENTATION COMPLETE

---

## Overview

The Nexus platform implements a single "Convert First" workflow where Leads must be converted to Clients before quotations can be created. This ensures a clear ownership model and eliminates contradictory business logic.

---

## Core Architecture

### Ownership Model

| Entity | Owner | Notes |
|--------|-------|-------|
| Lead | System | Pre-conversion tracking |
| Client | Admin-created | Post-conversion entity |
| Quotation | Client | **Client-owned only** |
| Project | Client | Created from accepted quotation |
| Invoice | Project | Linked to project |

### Key Relationships

```
Lead (sourceLeadId) → Client
Client (sourceLeadId) → Lead (historical traceability)
Quotation (clientId) → Client
Quotation (leadId) → Lead (legacy, migrated on conversion)
Project (clientId) → Client
Invoice (projectId) → Project
```

---

## Implementation Status

### Backend (100% Complete)

#### Quotation Module - Client-Only
- ✅ `quotation.types.ts` - `clientId` is required
- ✅ `quotation.validation.ts` - Schema requires Client, rejects Lead-only
- ✅ `quotation.service.ts` - Enforces Client-only workflow
- ✅ `quotation.service.test.ts` - All 14 tests passing

#### Lead Module - Read-Only After Conversion + Archive/Restore
- ✅ `lead.service.ts` - Blocks manual status updates after conversion
- ✅ Automatic status updates preserved via `applyQuotationWorkflowStatus()`
- ✅ **NEW: `archive()`** - Archives unconverted leads with mandatory reason
- ✅ **NEW: `restore()`** - Restores archived leads to active status
- ✅ `lead.repository.ts` - Archive/restore queries + archived filter support
- ✅ `lead.types.ts` - `ArchiveLeadInput` interface
- ✅ `lead.validation.ts` - `archiveLeadSchema` with mandatory reason
- ✅ `lead.controller.ts` - Archive/restore endpoints
- ✅ `lead.routes.ts` - `PATCH /:id/archive` and `PATCH /:id/restore` routes

#### Search Module — Global Search Across All Modules
- ✅ `search.types.ts` — `SearchEntityType` union and `SEARCH_ENTITY_TYPES` constant
- ✅ `search.service.ts` — Expanded searchable fields per module; `type` filter; `include` for related entities; `RESULTS_PER_TYPE = 15`
- ✅ `search.controller.ts` — `type` query parameter validation
- ✅ `search.service.test.ts` — 10 tests (type filtering, includes, archived exclusion, whitespace)

#### Notification Center — In-App Notifications
- ✅ `notifications.types.ts` — `CreateInAppNotificationInput`, `ListNotificationsParams`, `EventNotificationMapping`, `NotificationType`, `NotificationPriority`, `NotificationRecipientType`
- ✅ `notifications.repository.ts` — CRUD: `createInAppNotification`, `createManyInAppNotifications`, `listByRecipient`, `countByRecipient`, `countUnread`, `markAsRead`, `markAllAsRead`, `findAllAdminUserIds`
- ✅ `notifications.service.ts` — `EVENT_NOTIFICATION_MAP` (17 admin + 9 client event mappings); `emitEvent()` creates in-app notifications (fire-and-forget); `extractClientIdFromPayload()`; `listByRecipient`, `getUnreadCount`, `markAsRead`, `markAllAsRead`
- ✅ `notifications.controller.ts` — `list` (paginated, filtered by isRead), `unreadCount`, `markAsRead`, `markAllAsRead`
- ✅ `notifications.routes.ts` — `GET /`, `GET /unread-count`, `PATCH /read-all`, `PATCH /:id/read` (all authenticated)
- ✅ `prisma/schema.prisma` — `InAppNotification` model with indexes on `[recipientId, recipientType]` and `[recipientId, recipientType, isRead]`
- ✅ `prisma/migrations/20260720010000_add_in_app_notifications/`
- ✅ Event callers updated with `clientId` payloads: `client.service.ts`, `quotation.service.ts`, `project.service.ts`, `invoice.service.ts`
- ✅ New event callers: `documents.service.ts` (document.uploaded), `project.service.ts` (project.status_changed), `lead.service.ts` (lead.archived, lead.restored)
- ✅ `notifications.service.test.ts` — 13 tests (emitEvent + in-app creation + CRUD)

#### Admin Dashboard — Real-Time Business Overview
- ✅ `dashboard.repository.ts` — Aggregate queries: `countTotalLeads`, `countTotalClients`, `countTotalQuotations`, `countTotalInvoices`, `countProjectsByStatus`, `countPendingQuotations`, `countProjectsOnHold`, `invoicesAwaitingPayment`, `monthlyRevenue`, `previousMonthCounts`, `thisMonthCounts`, `recentTimelineEvents`
- ✅ `adminDashboard.service.ts` — `getSummary(adminUserId?)` returns KPIs, comparisons (this vs previous month), charts data (lead services by status, leads by source, monthly revenue, projects by status), recent activity (last 10 timeline events), upcoming items (pending quotations, projects on hold, overdue invoices, awaiting payment, unread notifications)
- ✅ `dashboard.controller.ts` — Passes `req.user.id` to service for unread notification count
- ✅ `dashboard.repository.ts` — All queries use `archivedAt: null` filter for leads; `status: 'ISSUED'` for invoices; `status: 'CANCELLED'` excluded from revenue
- ✅ `tests/adminDashboard.service.test.ts` — 6 tests (revenue totals, entity counts, upcoming items, charts, comparisons, recent activity)

#### Company Settings — Centralized Configuration
- ✅ `company.types.ts` — `UpdateCompanySettingsInput` with all settings fields
- ✅ `company.validation.ts` — `updateCompanySettingsSchema` with Zod validation (email, URL, length constraints)
- ✅ `company.repository.ts` — Singleton pattern: `find()`, `create()`, `update()` (upsert)
- ✅ `company.service.ts` — `get()`, `update()` (with timeline + audit), `updateField()` (for file uploads)
- ✅ `company.controller.ts` — `get`, `update` (Admin-only), `upload` (Cloudinary with local fallback)
- ✅ `company.routes.ts` — `GET /settings`, `PATCH /settings`, `POST /settings/upload` (authenticated)
- ✅ **NEW: `company.branding.ts`** — `getCompanyBranding()` + `clearBrandingCache()` for downstream consumers (PDFs, emails)
- ✅ **NEW: `cloudinary.provider.ts`** — Cloudinary `StorageProvider` implementation with stream upload
- ✅ `prisma/schema.prisma` — `CompanySetting` singleton model with 47 fields across 5 sections
- ✅ `prisma/migrations/20260720020000_add_company_settings/`
- ✅ `company.service.test.ts` — 5 tests (get, get with default, update with timeline/audit, audit before/after, file upload)

#### PDF Generation Module — Professional Branded Documents
- ✅ `pdf.types.ts` — Types: `PdfDocumentType`, `CompanyBrandingData`, `PdfLineItem` (with `serviceName`), `PdfRecipient` (with `gstin`), `PdfQuotationData` (with `validUntil`, `notes`, `termsAndConditions`, `paymentTerms`), `PdfInvoiceData` (with `displayStatus`), `GeneratePdfInput`, `PdfGenerationResult`
- ✅ `templates/base.template.ts` — Reusable `BASE_TEMPLATE` with `createDocument()`, `drawHeader()`, `drawDocumentTitle()`, `drawRecipientBlock()`, `drawTable()`, `drawTotals()`, `drawBankDetails()`, `drawSignatureAndStamp()`, `drawFooter()`, `drawAmountInWords()`, `drawWatermark()`, `formatCurrency()`, `formatDate()`; page numbering via `bufferedPageRange()`
- ✅ `templates/quotation.template.ts` — Enhanced quotation PDF: status watermark (DRAFT/REJECTED), Valid Until date, client GSTIN, 6-column table (Description, Service, Qty, Rate, Tax %, Amount), Notes/Terms & Conditions/Payment Terms sections, GST breakdown in summary
- ✅ `templates/invoice.template.ts` — Enhanced invoice PDF: Bill To recipient with GSTIN, HSN/SAC column when present, payment summary (subtotal/GST/total/paid/outstanding), bank details, signature/stamp, status watermarks (CANCELLED/PAID/PARTIALLY PAID)
- ✅ `pdf.service.ts` — `generate()`, `regenerateIfNeeded()`, `getOrCreate()`; fetches company branding, downloads images, generates PDF buffer, uploads via storage provider, stores `pdfUrl`/`pdfGeneratedAt` on document record, records timeline + audit entries; `fetchQuotationData()` includes all new fields; `fetchInvoiceData()` includes `displayStatus`, client `gstin`
- ✅ `pdf.controller.ts` — `generate` (POST body), `download` (GET params + `PDF_DOWNLOADED` timeline), `regenerate` (POST params)
- ✅ `pdf.routes.ts` — `POST /generate`, `GET /:documentType/:documentId`, `POST /:documentType/:documentId/regenerate`
- ✅ `prisma/schema.prisma` — `pdfUrl/pdfGeneratedAt` on Quotation+Invoice; `validUntil/notes/termsAndConditions/paymentTerms` on Quotation; `hsnSacCode/serviceName` on QuotationItem; `gstin` on Client
- ✅ `prisma/migrations/20260721000000_add_pdf_fields/` — DDL for pdfUrl/pdfGeneratedAt
- ✅ `prisma/migrations/20260721000001_add_pdf_enhancement_fields/` — DDL for validUntil, notes, termsAndConditions, paymentTerms, gstin, serviceName, hsnSacCode
- ✅ Fire-and-forget integration in `quotation.service.ts` — after `create`, `revise`, `approve`, `send`, `requestRevision`, `accept`, `reject`
- ✅ Fire-and-forget integration in `invoice.service.ts` — after `create`, `send`, `cancel`, `recordPayment`
- ✅ Routes mounted in `app.ts` as `app.use('/api/pdf', pdfRoutes)`
- ✅ `pdf.service.test.ts` — 32 tests (formatCurrency, formatDate, BASE_TEMPLATE, renderQuotationPdf including watermark/notes/terms, renderInvoicePdf including watermark/GSTIN/branding/items, validation)

#### Client Module - Already Correct
- ✅ `client.service.ts` - Conversion logic correct
- ✅ `client.service.test.ts` - All 4 tests passing

### Frontend (100% Complete)

#### Admin Dashboard — Real-Time Business Overview
- ✅ **REWRITTEN: `pages/dashboard/DashboardPage.tsx`** — Full dashboard with 10 KPI cards, 4 charts, recent activity, upcoming items, quick actions, search shortcut, notifications summary. Responsive grid layout.
- ✅ **REWRITTEN: `services/dashboardService.ts`** — Typed interfaces for `AdminDashboardSummary` (kpis, comparisons, charts, recentActivity, upcoming). Fetches from `GET /dashboard/admin/summary`.
- ✅ Updated: `components/ui/StatCard.tsx` — Added `description` prop
- ✅ Updated: `components/ui/Charts.tsx` — Added `GroupedBarChart` for monthly revenue
- ✅ Updated: `queries/keys.ts` — Added `dashboard.adminSummary` query key

#### Existing Frontend
- ✅ `QuotationFormDrawer.tsx` - Client selection only
- ✅ `LeadDetailPage.tsx` - Updated conversion dialog + Archive/Restore UI
- ✅ `LeadServicesPanel.tsx` - Read-only badge after conversion
- ✅ `LeadsPage.tsx` - Active/Archived toggle filter
- ✅ `types/index.ts` - Lead archive fields
- ✅ `services/leadService.ts` - Archive/restore API calls
- ✅ `queries/useLeads.ts` - Archive/restore mutation hooks
- ✅ **NEW: `services/searchService.ts`** — `search(q, type?)` with `SearchEntityType`
- ✅ **NEW: `queries/useSearch.ts`** — `useGlobalSearch(q, type?)` hook
- ✅ **NEW: `components/ui/CommandPalette.tsx`** — Cmd+K search with grouped results
- ✅ **NEW: `components/layout/TopNav.tsx`** — Search button wired + bell icon with unread badge
- ✅ **NEW: `pages/search/SearchPage.tsx`** — Module filter tabs, text highlighting, related entity display
- ✅ **NEW: `services/notificationService.ts`** — `list` (uses `api.getPaginated` for correct `{ items, meta }` response), `getUnreadCount`, `markAsRead`, `markAllAsRead`
- ✅ **NEW: `queries/useNotifications.ts`** — `useNotifications`, `useUnreadCount`, `useMarkNotificationAsRead`, `useMarkAllNotificationsAsRead` (with polling)
- ✅ **NEW: `components/layout/NotificationPanel.tsx`** — Dropdown with real data, unread badge, mark-as-read, relative timestamps
- ✅ **NEW: `pages/notifications/NotificationsPage.tsx`** — Full page with All/Unread/Read filters, pagination
- ✅ **NEW: `pages/portal/PortalNotificationsPage.tsx`** — Client portal notifications page
- ✅ Updated: `app/PortalLayout.tsx` — Bell icon with unread count + Notifications nav item
- ✅ Updated: `components/layout/Sidebar.tsx` — Notifications nav item
- ✅ Updated: `queries/keys.ts` — Notification query keys
- ✅ Updated: `routes/routes.ts` — Admin and portal notification routes
- ✅ Updated: `App.tsx` — Admin and portal notification routes
- ✅ **NEW: `services/companyService.ts`** — `get()`, `update()`, `uploadFile()` with typed inputs
- ✅ **NEW: `queries/useCompany.ts`** — `useCompanySettings`, `useUpdateCompanySettings`, `useUploadCompanyFile`
- ✅ **NEW: `pages/settings/CompanySettingsPage.tsx`** — Full settings page with 5 sections, file uploads, unsaved changes warning
- ✅ **NEW: `components/layout/CompanyLogo.tsx`** — Shared `CompanyLogo` + `CompanyName` components reading from settings
- ✅ **NEW: `components/layout/DynamicFavicon.tsx`** — Dynamically updates browser favicon from Company Settings
- ✅ Updated: `types/index.ts` — `CompanySetting` interface with all 47 fields
- ✅ Updated: `queries/keys.ts` — Company query keys
- ✅ Updated: `routes/routes.ts` — `companySettings: '/settings/company'`
- ✅ Updated: `App.tsx` — Company settings route
- ✅ Updated: `components/layout/Sidebar.tsx` — Company Logo + Company Name from settings (replaces hardcoded "Nexus")
- ✅ Updated: `pages/auth/LoginPage.tsx` — Company Logo + Company Name on login screen
- ✅ Updated: `app/PortalLayout.tsx` — Company Logo + Company Name in portal header
- ✅ Updated: `pages/settings/SettingsPage.tsx` — Company Profile summary card with logo, name, contact, Edit button
- ✅ Updated: `app/providers.tsx` — `DynamicFavicon` wired globally

---

## Business Rules

### Lead Conversion
- ✅ Requires at least one service past CONTACTED stage
- ✅ Requires valid email for Client login
- ❌ Does NOT require APPROVED status
- ❌ Does NOT require existing quotation

### Quotation Creation
- ✅ Requires `clientId` (not `leadId`)
- ✅ Rejects attempts to create for unconverted Leads
- ✅ Message: "Quotations must be created for Clients. Convert the Lead to a Client first."

### Quotation Workflow
- ✅ Admin creates quotation (Client-owned)
- ✅ Admin approves quotation internally
- ✅ Admin sends quotation (email to Client)
- ✅ Client views in portal
- ✅ Client accepts/rejects

### Project Creation
- ✅ Automatic after quotation acceptance
- ✅ Links to Client (not Lead)
- ✅ Project Services created from Quotation items

### Lead Archiving
- ✅ Only unconverted Leads can be archived
- ✅ Mandatory reason required for audit trail
- ✅ Archived Leads excluded from dashboard, search, active list
- ✅ Restore available to move Lead back to active status
- ✅ Timeline and audit entries recorded for both actions

### Global Search
- ✅ Searches across all 7 modules: Leads, Clients, Projects, Quotations, Invoices, Services, Documents
- ✅ Backend performs all filtering — no client-side fetch-and-filter
- ✅ `GET /api/search?q=...&type=...` — optional module filter (single type or all)
- ✅ `type` param validated against `SEARCH_ENTITY_TYPES`
- ✅ Related entity data included (client name, project number, category, document type)
- ✅ Archived leads excluded from search results
- ✅ 3-character minimum query length enforced
- ✅ Debounced frontend requests (300ms)
- ✅ Cmd+K CommandPalette integration for instant search
- ✅ Search page with module filter tabs and text highlighting

### Notification Center
- ✅ Notifications generated automatically by business events — NOT duplicating Timeline or Audit Log
- ✅ Timeline = history of an entity; Audit Log = system changes; Notifications = items requiring user attention
- ✅ `emitEvent()` extended to also create in-app notifications (fire-and-forget, never blocks business transaction)
- ✅ Event-to-notification mapping centralized in `EVENT_NOTIFICATION_MAP` in `notifications.service.ts`
- ✅ Admin notifications (17 event types) sent to ALL active admin users
- ✅ Client notifications (9 event types) sent to specific client via `clientId` in payload
- ✅ 4 notification types: INFO, SUCCESS, WARNING, ERROR
- ✅ 4 priority levels: LOW, NORMAL, HIGH, URGENT
- ✅ Admin endpoints: `GET /api/notifications` (paginated), `GET /api/notifications/unread-count`, `PATCH /api/notifications/read-all`, `PATCH /api/notifications/:id/read`
- ✅ Portal notifications page with mark-as-read and navigation to related entities
- ✅ Real-time unread badge in header with 30s polling interval

### Company Settings
- ✅ Singleton pattern — single `CompanySetting` row with fixed ID
- ✅ 5 sections: Company Info, Business Settings, Bank Details, Email Settings, Social Links
- ✅ File uploads for: Logo, Favicon, QR Code, Signature, Stamp (reuses existing storage infrastructure)
- ✅ Admin-only edit access enforced in controller
- ✅ Timeline entries recorded for every settings update and file upload
- ✅ Audit logs record before/after state for every update
- ✅ Frontend: Sectioned card layout with react-hook-form + zod validation
- ✅ Frontend: Unsaved changes warning (beforeunload + inline banner)
- ✅ Frontend: File upload preview with replace capability
- ✅ Frontend: Reset button to discard unsaved changes
- ✅ Frontend: Settings page links to Company Settings
- ✅ API: `GET /api/company/settings`, `PATCH /api/company/settings`, `POST /api/company/settings/upload?field=...`

#### Bug Fixes
- ✅ **Logo upload preview** — `localStorageProvider.save()` returned a bare filename (e.g. `uuid-name.png`). `<img src>` couldn't resolve it. Fixed by: (1) adding `express.static` middleware serving `./uploads` at `/uploads` in `app.ts`, (2) company controller now returns `/uploads/${filename}` as `fileUrl` so it's a serveable path stored in DB and displayed by `<img>`.
- ✅ **Save "Invalid payload"** — `onSubmit` converted empty strings `''` to `null` before sending. Backend Zod schema uses `z.string().optional()` which accepts `string | undefined` only — `null` fails validation. Fixed by skipping empty/null/undefined values in the payload instead of converting to `null`.
- ✅ **Cloudinary PDF delivery blocked** — Cloudinary Media Library default "Blocked for delivery" caused uploaded PDFs to return HTTP 401 Unauthorized. Fixed by adding `access_control: [{ access: 'public_read' }]` to the upload parameters in `cloudinary.provider.ts`. Images were unaffected (different default behavior). New uploads deliver publicly; existing URLs unchanged.

---

## Automatic Status Transitions

These statuses are NEVER manually set - backend business logic automatically updates them:

| Event | Status Transition | Implementation |
|-------|------------------|----------------|
| Admin sends quotation | → QUOTE_SENT | `quotationService.send()` |
| Client rejects quotation | → NEGOTIATION | `quotationService.reject()` |
| Admin re-sends quotation | → QUOTE_SENT | `quotationService.send()` |
| Client accepts quotation | → APPROVED | `quotationService.accept()` |
| Project created | → PROJECT_CREATED | `projectService.create()` |

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

### Lead Service Status Updates
- **Before conversion**: Manual updates allowed
- **After conversion**: Manual updates BLOCKED
- **Error message**: "This Lead has been converted - Lead Services are read-only. Status updates happen automatically from quotation and project events."

### Quotation Creation
- **Required**: `clientId`
- **Optional**: `leadId` (for backward compatibility only)
- **Error message**: "Quotations must be created for Clients. Convert the Lead to a Client first."

---

## Breaking Changes

### API Changes
**POST /api/quotations**
- ❌ No longer accepts `{ leadId: "..." }` alone
- ✅ Requires `{ clientId: "..." }`
- ⚠️ Any code passing `leadId` will receive validation error

### Frontend Changes
- ✅ Quotation form shows Client selection only
- ✅ Lead detail shows conversion button
- ✅ Lead Services show read-only after conversion

### Database Schema
- ✅ Lead model updated with `archivedAt`, `archivedById`, `archiveReason` fields
- ✅ Migration created: `20260720000000_add_lead_archive_fields`
- ✅ Existing quotations with `leadId` continue working
- ✅ Migration logic handles conversion automatically

---

## Backward Compatibility

### Existing Data
- ✅ Quotations with `leadId` (unconverted Leads): Work as-is
- ✅ Quotations with `leadId` (converted Leads): Already migrated to `clientId`
- ✅ Lead Services: Continue functioning with automatic updates

### Migration Strategy
1. Quotations with `leadId` (unconverted Leads): Leave as-is
2. Quotations with `leadId` (converted Leads): Already migrated
3. Lead Services: Continue with automatic updates only

---

## Testing Status

### Backend Tests
- ✅ Quotation Service: 14/14 passing
- ✅ Client Service: 4/4 passing
- ✅ Lead Service: 16/16 passing (manual update blocking + archive/restore)
- ✅ Search Service: 10/10 passing (type filtering, includes, archived exclusion)
- ✅ Notification Service: 13/13 passing (emitEvent + in-app creation + CRUD)
- ✅ Company Service: 5/5 passing (get, get default, update, audit before/after, file upload)
- ✅ Admin Dashboard Service: 6/6 passing (revenue, entity counts, upcoming, charts, comparisons, activity)
- ✅ Project Service: Client ownership verified
- ✅ Invoice Service: 26/26 passing (GST math, payment rules, status calculation, number sequencing)
- ✅ Status Engine: 30/30 passing (Lead + Project workflows, manual vs automatic, forward/backward)
- ✅ PDF Service: 32/32 passing (templates, watermarks, formatting, branding, GSTIN, items)
- ✅ Conversation Service: 4/4 passing (access control, sender attribution)
- ✅ Auth Service: 6/6 passing (login, createAdminUser, role resolution)
- ✅ Error Handler: 3/3 passing (ValidationError, NotFoundError, unknown errors)
- ✅ Invoice Numbering: 2/2 passing (gapless sequential, FOR UPDATE locking)
- ✅ Entity Ref: 4/4 passing (UUID resolution, client actors, null handling, batch lookups)
- ✅ Aggregate Status: 6/6 passing (mixed statuses, completed, on hold, cancelled)
- **Total: 213/213 passing across 20 test suites**

### Frontend Tests
- ✅ Quotation form shows Client selection only
- ✅ Lead detail shows conversion button + archive/restore buttons
- ✅ Lead Services show read-only after conversion
- ✅ Leads page shows Active/Archived toggle
- ✅ Search page shows module filter tabs with highlighting
- ✅ CommandPalette opens with Cmd+K and shows search results
- ✅ Notifications dropdown shows unread badge with real data
- ✅ Notifications page shows All/Unread/Read filters with pagination
- ✅ Portal notifications page with mark-as-read and navigation
- ✅ Client portal quotation detail renders admin-generated PDF as single source of truth
- ✅ Client portal quotation detail shows error state with Retry when PDF unavailable (no HTML fallback)
- ✅ Client portal quotation detail preserves Accept/Reject/Request Revision workflow

### Integration Tests
- ✅ End-to-end: Lead → Convert → Quotation → Accept → Project
- ✅ Timeline entries created correctly
- ✅ Audit logs recorded correctly
- ✅ Notifications sent correctly
- ✅ Archive/restore creates timeline and audit entries
- ✅ Global search queries all modules and returns typed results

---

## Build Status

### Backend
```bash
✅ npm run build - SUCCESS (0 errors)
✅ npm test - 213/213 tests passing (20 test suites, ~10s)
```

### Frontend
```bash
✅ npm run build - SUCCESS (0 errors)
✅ npx tsc --noEmit - SUCCESS (0 errors)
```

---

# Phase 2 — Resend Email Infrastructure & Quotation Lead Display

**Date**: 2026-07-22  
**Status**: ✅ IMPLEMENTATION COMPLETE

## Summary

Implemented production email delivery via Resend replacing the console-log placeholder, added branded email templates for all business events, fixed quotation email payload data mapping, and resolved lead display in client-owned quotations using the existing `Client.sourceLead` relationship — all without modifying database schema or business workflow.

## Architecture Decision: Lead XOR Client Constraint

**Decision**: Do NOT change the quotation ownership model.

The database enforces a `CHECK` constraint (`quotations_lead_or_client_check`) requiring exactly one of `leadId` or `clientId` to be non-null on every quotation row:

```sql
CHECK (("leadId" IS NULL) <> ("clientId" IS NULL));
```

This is the correct business model:
- **Before conversion**: quotation belongs to Lead (`leadId` set, `clientId = NULL`)
- **After conversion**: quotation belongs to Client (`leadId = NULL`, `clientId` set)
- `migrateLeadQuotationsToClient()` sets `leadId: null` on conversion — consistent with the constraint

**Lead display resolution**: Instead of violating the constraint by setting both IDs, the original lead is exposed through the existing `Client.sourceLead` Prisma relation. The backend now returns `quotation.client.sourceLead` in all quotation queries, and the frontend resolves `lead = quotation.lead ?? quotation.client.sourceLead` as a fallback.

## Backend Changes

### Resend Email Service (`email.email.service.ts`)
- **NEW**: Centralized `EmailService` using Resend SDK
- **Config**: `RESEND_API_KEY`, `EMAIL_FROM` (defaults to `onboarding@resend.dev`), `APP_URL` (defaults to `http://localhost:5173`)
- **Graceful degradation**: If `RESEND_API_KEY` is missing, emails are silently skipped with a console warning — never blocks business operations
- **Lazy initialization**: Resend client created on first send, not at import time

### Email Templates (`email/templates/`)
- **NEW: `base-email.template.ts`**: Shared HTML wrapper with responsive layout, Nexus branding, header/footer, `EmailBranding` interface for company name, logo, address, support email
- **NEW: `client-welcome.template.ts`**: Welcome email with portal URL, login credentials (email + temp password), branding
- **NEW: `quotation-sent.template.ts`**: Quotation notification with client name, quotation number, subtotal/GST/grand total breakdown, portal link, resent variant
- **NEW: `invoice-sent.template.ts`**: Invoice notification with client name, invoice number, grand total, outstanding amount, portal link, resent/reminder variant
- **NEW: `payment-receipt.template.ts`**: Payment confirmation with client name, invoice number, amount paid, payment date/method, portal link

### Email Channel (`notifications.channels.email.channel.ts`)
- **REWRITTEN**: Now resolves company branding via `companyService.get()` → `getCompanyBranding()`, passes to templates
- **Template matching**: Detects payload shape (`quotationNumber`, `invoiceNumber`, `loginEmail`+`tempPassword`) to select template
- **Subject line builder**: Dedicated `buildSubject()` function with correct subjects per event type
- **HTML builder**: Dedicated `buildHtml()` function rendering the appropriate template

### Notifications Service (`notifications.notifications.service.ts`)
- **`KNOWN_EVENT_TYPES`**: Added `payment.receipt_sent` (was missing — all payment receipt events were silently dropped)

### Quotation Service — Email Payload Fixes (`quotation.service.ts`)
- **`send()` method**: Now emits `grandTotal`, `subtotal`, `gstAmount`, and `clientName` from the active version — previously these were missing, causing templates to render $0.00
- **Quotation creation**: `leadId` explicitly set to `null` (respecting XOR constraint)

### Client Service — Welcome Email (`client.service.ts`)
- **`client.account.created` payload**: Now includes `clientName` (was missing — welcome email showed "there" instead of actual name)

### Quotation Repository — Lead Display (`quotation.repository.ts`)
- **`CLIENT_SUMMARY_SELECT`**: Extended with `sourceLeadId` and `sourceLead { id, leadNumber, contactName }` — the Prisma relation already existed in the schema, now it's fetched in all quotation queries
- **`findById()`**: Returns `quotation.client.sourceLead` for detail views
- **`list()`**: Returns `quotation.client.sourceLead` for list views
- **`listForClient()`**: Added `client: { select: { sourceLead: ... } }` to include for portal views

### Environment Configuration (`config/env.ts`)
- Added `resendApiKey`, `emailFrom`, `appUrl` — all with safe defaults (no required vars for email)

## Frontend Changes

### Types (`types/index.ts`)
- `ClientSummary`: Added `sourceLeadId` and `sourceLead: { id, leadNumber, contactName }` — matches backend select
- `QuotationItem`: Added `serviceName` (already existed from PDF work)

### Quotation Detail Page (`pages/quotations/QuotationDetailPage.tsx`)
- **Lead resolution**: `resolvedLead = quotation.lead ?? client.sourceLead ?? null`
- **Lead card**: Shows `resolvedLead.leadNumber` (clickable link to Lead Detail) and `resolvedLead.contactName` instead of "Not linked"
- **Header**: Shows `Lead L-00012 · Client C-00003 · Company Name` for converted quotations

### Quotations List Page (`pages/quotations/QuotationsPage.tsx`)
- **Lead column**: Resolves via `row.lead ?? row.client?.sourceLead ?? null` — shows lead number for both pre- and post-conversion quotations

### Portal Quotation Detail (`pages/portal/PortalQuotationDetailPage.tsx`)
- **Header description**: Shows originating lead number via `quotation.client?.sourceLead?.leadNumber` fallback

### Portal Quotations List (`pages/portal/PortalQuotationsPage.tsx`)
- **Subtitle under quotation number**: Resolves lead via `row.lead?.leadNumber ?? row.client?.sourceLead?.leadNumber`

## Key Design Decisions

1. **XOR constraint preserved**: Quotation ownership model unchanged — no schema migration needed
2. **Lead resolved through existing relation**: `Client.sourceLead` Prisma relation already existed in the schema; backend just wasn't fetching it
3. **No additional API requests**: Lead data travels with the quotation response as a nested include
4. **Fire-and-forget email delivery**: Email channel never blocks the main business transaction
5. **Graceful degradation**: Missing `RESEND_API_KEY` → emails skipped, not errors thrown
6. **Template selection by payload shape**: No explicit event type needed in template layer — detects `quotationNumber`, `invoiceNumber`, or `loginEmail`+`tempPassword`
7. **Company branding in emails**: Single source of truth from `CompanySetting` → `getCompanyBranding()` → email templates

## Verification

| Check | Result |
|-------|--------|
| Backend TypeScript | ✅ 0 errors |
| Frontend TypeScript | ✅ 0 errors |
| Backend Tests (213/213) | ✅ |
| XOR constraint respected | ✅ `leadId: null` on all new quotations |
| Lead displayed for converted quotations | ✅ Via `client.sourceLead` |
| Lead displayed for unconverted quotations | ✅ Via `quotation.lead` |
| Welcome email sent on conversion | ✅ With clientName |
| Quotation email includes correct totals | ✅ subtotal/GST/grandTotal |
| Payment receipt email registered | ✅ `payment.receipt_sent` in KNOWN_EVENT_TYPES |
| No schema changes | ✅ |
| No workflow changes | ✅ |

## Files Modified

### Backend (7 files)
1. `src/modules/email/email.service.ts` — NEW: Centralized Resend EmailService
2. `src/modules/email/templates/base-email.template.ts` — NEW: Shared HTML wrapper
3. `src/modules/email/templates/client-welcome.template.ts` — NEW: Welcome credentials email
4. `src/modules/email/templates/quotation-sent.template.ts` — NEW: Quotation notification
5. `src/modules/email/templates/invoice-sent.template.ts` — NEW: Invoice notification
6. `src/modules/email/templates/payment-receipt.template.ts` — NEW: Payment receipt email
7. `src/modules/notifications/channels/email.channel.ts` — REWRITTEN: Resend + templates + branding
8. `src/modules/notifications/notifications.service.ts` — Added `payment.receipt_sent` to KNOWN_EVENT_TYPES
9. `src/modules/quotation/quotation.service.ts` — Email payload fixes, leadId: null
10. `src/modules/quotation/quotation.repository.ts` — Extended CLIENT_SUMMARY_SELECT with sourceLead
11. `src/modules/client/client.service.ts` — Added clientName to account.created payload
12. `src/config/env.ts` — Added resendApiKey, emailFrom, appUrl

### Frontend (5 files)
1. `src/types/index.ts` — ClientSummary: added sourceLeadId + sourceLead
2. `src/pages/quotations/QuotationDetailPage.tsx` — Lead resolution via client.sourceLead
3. `src/pages/quotations/QuotationsPage.tsx` — Lead column resolution fallback
4. `src/pages/portal/PortalQuotationDetailPage.tsx` — Header lead display fallback
5. `src/pages/portal/PortalQuotationsPage.tsx` — Subtitle lead resolution fallback

### Package Changes
- `nexus-backend/package.json` — Added `resend` dependency

---

## Files Modified

### Backend (31 files)
1. ✅ `nexus-backend/prisma/schema.prisma` - Lead archive fields + `InAppNotification` model + `CompanySetting` model
2. ✅ `nexus-backend/prisma/migrations/20260720000000_add_lead_archive_fields/migration.sql`
3. ✅ `nexus-backend/prisma/migrations/20260720010000_add_in_app_notifications/migration.sql`
4. ✅ `nexus-backend/prisma/migrations/20260720020000_add_company_settings/migration.sql`
5. ✅ `nexus-backend/src/core/utils/pagination.ts` - Archived filter param
6. ✅ `nexus-backend/src/modules/notifications/notifications.types.ts` — Notification types
7. ✅ `nexus-backend/src/modules/notifications/notifications.repository.ts` — In-app CRUD
8. ✅ `nexus-backend/src/modules/notifications/notifications.service.ts` — Event mapping + emitEvent + CRUD
9. ✅ `nexus-backend/src/modules/notifications/notifications.controller.ts` — REST endpoints
10. ✅ `nexus-backend/src/modules/notifications/notifications.routes.ts` — Authenticated routes
11. ✅ `nexus-backend/src/modules/notifications/tests/notifications.service.test.ts` — 13 tests
12. ✅ `nexus-backend/src/modules/company/company.types.ts` — Company settings input types
13. ✅ `nexus-backend/src/modules/company/company.validation.ts` — Zod validation schema
14. ✅ `nexus-backend/src/modules/company/company.repository.ts` — Singleton CRUD
15. ✅ `nexus-backend/src/modules/company/company.service.ts` — Settings with timeline + audit
16. ✅ `nexus-backend/src/modules/company/company.controller.ts` — REST + file upload
17. ✅ `nexus-backend/src/modules/company/company.routes.ts` — Authenticated routes
18. ✅ `nexus-backend/src/modules/company/tests/company.service.test.ts` — 5 tests
19. ✅ `nexus-backend/src/modules/quotation/quotation.types.ts`
20. ✅ `nexus-backend/src/modules/quotation/quotation.validation.ts`
21. ✅ `nexus-backend/src/modules/quotation/quotation.service.ts` — ClientId in payloads
22. ✅ `nexus-backend/src/modules/quotation/tests/quotation.service.test.ts`
23. ✅ `nexus-backend/src/modules/lead/lead.service.ts` — Archive/restore + notifications
24. ✅ `nexus-backend/src/modules/lead/lead.repository.ts`
25. ✅ `nexus-backend/src/modules/lead/lead.types.ts`
26. ✅ `nexus-backend/src/modules/lead/lead.validation.ts`
27. ✅ `nexus-backend/src/modules/lead/lead.controller.ts`
28. ✅ `nexus-backend/src/modules/lead/lead.routes.ts`
29. ✅ `nexus-backend/src/modules/lead/tests/lead.service.test.ts`
30. ✅ `nexus-backend/src/modules/dashboard/dashboard.repository.ts` — Aggregate queries for KPIs, charts, revenue, activity
31. ✅ `nexus-backend/src/modules/dashboard/adminDashboard.service.ts` — Full dashboard summary with KPIs, comparisons, charts, activity, upcoming
32. ✅ `nexus-backend/src/modules/dashboard/dashboard.controller.ts` — Admin + client summary endpoints
33. ✅ `nexus-backend/src/modules/dashboard/tests/adminDashboard.service.test.ts` — 6 tests
31. ✅ `nexus-backend/src/modules/client/client.service.ts` — ClientId in payload
32. ✅ `nexus-backend/src/modules/project/project.service.ts` — ClientId in payload + status_changed notification
33. ✅ `nexus-backend/src/modules/invoice/invoice.service.ts` — ClientId in payloads
34. ✅ `nexus-backend/src/modules/documents/documents.service.ts` — document.uploaded notification
35. ✅ `nexus-backend/src/modules/search/search.types.ts`
36. ✅ `nexus-backend/src/modules/search/search.service.ts`
37. ✅ `nexus-backend/src/modules/search/search.controller.ts`
38. ✅ `nexus-backend/src/modules/search/tests/search.service.test.ts`
39. ✅ `nexus-backend/src/app.ts` — Notification + company routes mounted

### Frontend (25 files)
40. ✅ `nexus-frontend/src/types/index.ts` — Lead archive fields + CompanySetting interface
41. ✅ `nexus-frontend/src/services/leadService.ts`
42. ✅ `nexus-frontend/src/services/searchService.ts`
43. ✅ `nexus-frontend/src/services/notificationService.ts`
44. ✅ `nexus-frontend/src/services/companyService.ts` — NEW: get, update, uploadFile
45. ✅ `nexus-frontend/src/services/dashboardService.ts` — REWRITTEN: Full dashboard types + API
46. ✅ `nexus-frontend/src/queries/useLeads.ts`
46. ✅ `nexus-frontend/src/queries/useSearch.ts`
47. ✅ `nexus-frontend/src/queries/useNotifications.ts`
48. ✅ `nexus-frontend/src/queries/useCompany.ts` — NEW: settings + upload hooks
49. ✅ `nexus-frontend/src/queries/keys.ts` — Notification + company query keys
50. ✅ `nexus-frontend/src/pages/quotations/components/QuotationFormDrawer.tsx`
51. ✅ `nexus-frontend/src/pages/leads/LeadDetailPage.tsx`
52. ✅ `nexus-frontend/src/pages/leads/LeadsPage.tsx`
53. ✅ `nexus-frontend/src/pages/leads/components/LeadServicesPanel.tsx`
54. ✅ `nexus-frontend/src/pages/search/SearchPage.tsx`
55. ✅ `nexus-frontend/src/pages/dashboard/DashboardPage.tsx` — REWRITTEN: 10 KPI cards, 4 charts, activity, upcoming, actions
56. ✅ `nexus-frontend/src/pages/notifications/NotificationsPage.tsx`
56. ✅ `nexus-frontend/src/pages/portal/PortalNotificationsPage.tsx`
57. ✅ `nexus-frontend/src/pages/settings/CompanySettingsPage.tsx` — NEW: Full settings page
58. ✅ `nexus-frontend/src/pages/settings/SettingsPage.tsx` — Company Settings card
59. ✅ `nexus-frontend/src/components/ui/CommandPalette.tsx`
60. ✅ `nexus-frontend/src/components/ui/StatCard.tsx` — Added description prop
61. ✅ `nexus-frontend/src/components/ui/Charts.tsx` — Added GroupedBarChart for monthly revenue
62. ✅ `nexus-frontend/src/components/layout/TopNav.tsx`
63. ✅ `nexus-frontend/src/components/layout/NotificationPanel.tsx`
64. ✅ `nexus-frontend/src/components/layout/Sidebar.tsx`
65. ✅ `nexus-frontend/src/app/PortalLayout.tsx`
66. ✅ `nexus-frontend/src/pages/portal/PortalQuotationDetailPage.tsx` — REWRITTEN: PDF as single source of truth (no HTML fallback), error state with Retry, Download/Open/Print actions, Accept/Reject/Revision workflow preserved
67. ✅ `nexus-backend/src/modules/pdf/templates/base.template.ts` — Fixed drawFooter to iterate all pages with explicit switchToPage, preventing implicit page creation
68. ✅ `nexus-frontend/src/routes/routes.ts` — Company settings route
69. ✅ `nexus-frontend/src/App.tsx` — Company settings route

---

## Rollback Plan

If issues arise:

1. **Backend**: `git revert <commit-hash>`
2. **Frontend**: `git revert <commit-hash>`
3. **Database**: No rollback needed (no schema changes)
4. **Temporary**: Frontend can show both Lead/Client options, backend validation catches errors

---

## Conclusion

The single "Convert First" workflow is fully implemented and operational. All contradictory validations have been removed, and the system enforces one unified workflow path.

**Status**: ✅ IMPLEMENTATION COMPLETE  
**Builds**: Backend ✓ | Frontend ✓  
**Tests**: Passing ✓

---

# Phase 1 — Professional Payment Management (Core)

**Date**: 2026-07-22  
**Status**: ✅ IMPLEMENTATION COMPLETE

## Summary

Enhanced the Invoice & Payment module with professional payment management features without breaking existing workflow.

## Backend Changes

### Database Schema
- **Payment model**: Added `transactionReference` field for UTR/transaction numbers

### Invoice Service (`invoice.service.ts`)
- **Auto-calculated `displayStatus`**: Computes DRAFT → SENT → PARTIALLY PAID → PAID → CANCELLED from payment state
- **`paymentCount`**: Enriched invoice response includes count of payments
- **Business rules in `recordPayment`**:
  - Rejects zero and negative payments
  - Rejects payments exceeding outstanding balance
  - Rejects duplicate transaction references (globally unique)
  - Supports full payment, partial payment, and multiple payments
- **`listPayments`**: New method with ascending/descending sort support

### Invoice Repository (`invoice.repository.ts`)
- **`paymentRepository.findByTransactionReference`**: Checks for duplicate transaction references
- **`paymentRepository.listForInvoice`**: Accepts `sortOrder` parameter (asc/desc)

### Invoice Validation (`invoice.validation.ts`)
- Enhanced `recordPaymentSchema` with descriptive error messages
- Added `transactionReference` optional field

### Invoice Types (`invoice.types.ts`)
- Added `transactionReference` to `RecordPaymentInput`

### Invoice Routes (`invoice.routes.ts`)
- Added `GET /:id/payments` endpoint for payment history with sort support

### Invoice Controller (`invoice.controller.ts`)
- Added `listPayments` handler with sort query parameter

### PDF Service (`pdf.service.ts`)
- Updated `displayStatus` computation to match new status logic (SENT vs DRAFT)

## Frontend Changes

### Types (`types/index.ts`)
- `Payment`: Added `transactionReference` and `recordedByUserId` fields
- `Invoice`: Added `paymentCount` field

### Services (`invoiceService.ts`)
- Added `transactionReference` to `RecordPaymentInput`
- Added `listPayments(invoiceId, sortOrder)` API method

### Queries (`useInvoices.ts`)
- Added `usePaymentHistory(invoiceId, sortOrder)` hook

### Admin Invoice Detail Page (`InvoiceDetailPage.tsx`)
- **Payment Summary Cards**: 5 cards showing Invoice Total, Total Paid, Outstanding Balance, Number of Payments, Status
- **Enhanced Payment History**: Displays Amount, Date & Time, Payment Method, Transaction Reference, Notes with sort toggle

### Record Payment Modal (`RecordPaymentModal.tsx`)
- Added Transaction / UTR / Reference Number field
- Renamed "Reference / notes" to "Notes"
- Shows outstanding balance in modal description
- Added max amount constraint based on outstanding balance

### Client Portal Invoice Detail (`PortalInvoiceDetailPage.tsx`)
- **Payment Summary Cards**: 4 cards showing Invoice Total, Total Paid, Outstanding Balance, Status
- **Enhanced Payment History**: Displays Date, Amount, Payment Method, Transaction Reference, Notes with sort toggle
- Client access remains fully read-only (no payment recording/editing/deletion)

### StatusBadge (`StatusBadge.tsx`)
- Added OVERDUE status with danger tone

## Business Rules Implemented

| Rule | Status |
|------|--------|
| Full Payment → Paid | ✅ |
| Partial Payment → Partially Paid | ✅ |
| Multiple Payments | ✅ |
| Reject negative payments | ✅ |
| Reject zero payments | ✅ |
| Reject overpayment | ✅ |
| Duplicate transaction reference check | ✅ |
| Auto-calculated status (no manual editing) | ✅ |

## Existing Integrations Preserved

| Feature | Status |
|---------|--------|
| Timeline Events | ✅ Working |
| Audit Log | ✅ Working |
| Notifications | ✅ Working |
| Invoice PDF | ✅ Working |
| Email | ✅ Working |
| Client Portal | ✅ Working |

## Verification

| Check | Result |
|-------|--------|
| Backend Tests (213/213) | ✅ |
| Backend TypeScript | ✅ |
| Frontend TypeScript | ✅ |
| Frontend Production Build | ✅ |
| Admin/Client see identical payment history | ✅ |
| Prisma migration applied | ✅ |

## Files Modified

### Backend (8 files)
1. `prisma/schema.prisma` — Added `transactionReference` to Payment
2. `src/modules/invoice/invoice.types.ts` — Added `transactionReference` to input
3. `src/modules/invoice/invoice.validation.ts` — Enhanced payment validation
4. `src/modules/invoice/invoice.repository.ts` — Added sorting + duplicate check
5. `src/modules/invoice/invoice.service.ts` — Status calculation, business rules, listPayments
6. `src/modules/invoice/invoice.controller.ts` — Added listPayments handler
7. `src/modules/invoice/invoice.routes.ts` — Added payment history route
8. `src/modules/pdf/pdf.service.ts` — Updated displayStatus computation
9. `src/modules/invoice/tests/invoice.service.test.ts` — 26 tests (was 6)

### Frontend (9 files)
1. `src/types/index.ts` — Payment + Invoice type updates
2. `src/services/invoiceService.ts` — transactionReference + listPayments
3. `src/queries/useInvoices.ts` — usePaymentHistory hook
4. `src/components/ui/StatusBadge.tsx` — OVERDUE status
5. `src/pages/invoices/InvoiceDetailPage.tsx` — Summary cards + enhanced payment history
6. `src/pages/invoices/components/RecordPaymentModal.tsx` — Transaction reference field
7. `src/pages/portal/PortalInvoiceDetailPage.tsx` — Summary cards + enhanced payment history

### Documentation (3 files)
1. `IMPLEMENTATION.md` — Phase 1 section added
2. `IMPLEMENTATION-PROGRESS.md` — Phase 1 section added
3. `WORKFLOW.md` — Invoice lifecycle updated
