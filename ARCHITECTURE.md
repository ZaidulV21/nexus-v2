# Nexus — System Architecture & Reference

**Phase:** 17 (documentation-only)
**HEAD:** `e68278d` — Fixed dropdown and notification tab hover
**Last verified:** backend unit suite (28 suites / 467 tests) on Phase 17

This is the authoritative, implementation-accurate reference for the Nexus platform as it
exists today. It supersedes any stale claims in the historical phase notes of
`IMPLEMENTATION.md` / `IMPLEMENTATION-PROGRESS.md`. Everything here describes the current
code, schema, migrations, routes and flows — nothing is aspirational or planned.

---

## 1. Overview

Nexus is a full-stack business-service management platform:

- a **public marketing website** with a Get Quote enquiry wizard (`nexus-frontend`, `src/public-site/`)
- an **admin CRM** for leads, clients, quotations, projects, invoices, payments, CMS and company settings (`/admin/*`)
- a **client portal** where customers view quotations, projects, invoices, pay online and message the business (`/portal/*`)
- a **REST API** + PostgreSQL data model behind all three (`nexus-backend`)

The core pipeline is: **Lead → Client → Quotation → Project → Invoice → Payment**, where
Quotations and Projects are owned by a **Client** (a converted Lead), never by a raw Lead.

---

## 2. Repository layout

```
Nexus/
├── nexus-backend/        Express + TypeScript + Prisma + PostgreSQL (REST API)
│   ├── prisma/
│   │   ├── schema.prisma        Data model (source of truth)
│   │   ├── migrations/          Versioned SQL migration history
│   │   └── seed.ts              Permissions, default Admin, baseline catalog
│   ├── src/
│   │   ├── config/              env.ts, database.ts (Prisma singleton)
│   │   ├── core/                errors, middleware, storage, utils, tests
│   │   ├── modules/             23 feature modules (see §7.3)
│   │   ├── app.ts               Express assembly + route mounting
│   │   └── server.ts            Bootstrap
│   ├── scripts/                 E2E verification harnesses (§16)
│   └── docs/                    PRD, technical blueprint, implementation plan
├── nexus-frontend/      Vite + React 18 + TS + Tailwind v3 SPA
│   └── src/
│       ├── App.tsx             Route tree (public / admin / portal)
│       ├── routes/routes.ts    Single source of truth for paths
│       ├── app/                Layouts, auth guards, providers
│       ├── pages/              21 admin/portal page areas
│       ├── public-site/        Marketing website + Get Quote wizard
│       ├── services/           API client layer
│       ├── queries/            TanStack Query hooks + keys
│       ├── components/         UI kit + layout components
│       └── styles/globals.css  Tailwind + design tokens
├── README.md                    Quick start (updated in Phase 17)
├── ARCHITECTURE.md              This file
├── IMPLEMENTATION.md            Historical phase-by-phase notes
├── IMPLEMENTATION-PROGRESS.md   Progress tracker (Phase 17 entry)
├── IMPLEMENTATION-PLAN.md       Original plan
├── WORKFLOW.md                  Business workflow documentation
├── PAYMENTS.md                  Payment architecture & Razorpay reference
└── SINGLE-WORKFLOW-COMPLETE.md  Convert-First workflow record
```

---

## 3. Technology stack

### Backend (`nexus-backend/package.json`)

| Area | Choice |
|---|---|
| Runtime | Node.js 18+ (built-in `fetch` used by scripts) |
| Language | TypeScript 5.5 (CommonJS modules) |
| Framework | Express 4 |
| ORM | Prisma 5 (PostgreSQL, `prisma-client-js`) |
| Auth | JWT (`jsonwebtoken`), bcrypt password hashing, role-based access |
| Validation | Zod 3 |
| Payments | Razorpay SDK (online checkout + webhook), offline manual recording |
| Email | Resend (HTML templates, fire-and-forget, graceful skip without API key) |
| Storage | Pluggable: Cloudinary, local disk, S3 stub (see §17) |
| PDF | PDFKit (branded quotation / invoice / receipt generation) |
| Security | Helmet, CORS, `express-rate-limit`, raw body for the Razorpay webhook |
| Files | Multer (memory storage for uploads) |
| Testing | Jest 29 + ts-jest + supertest (unit); Node `fetch` E2E scripts |

### Frontend (`nexus-frontend/package.json`)

| Area | Choice |
|---|---|
| Build | Vite 5 + TypeScript 5.5 (`tsc -b && vite build`) |
| UI framework | **React 18.3** (`react`, `react-dom`) |
| Styling | **Tailwind CSS 3.4** (config-based, `tailwind.config.ts`, class-based dark mode), `tailwindcss-animate`, `@tailwindcss/typography` |
| Routing | **React Router 6.26** (`react-router-dom`) |
| Server state | TanStack React Query 5 (hooks in `src/queries/`) |
| Tables | TanStack React Table 8 |
| Forms | React Hook Form 7 + Zod 3 + `@hookform/resolvers` |
| Primitives | Radix UI (dialog, dropdown-menu, popover, select, tabs, tooltip, avatar, checkbox, switch, label, slot) |
| Styling utils | `class-variance-authority`, `clsx`, `tailwind-merge` |
| Search palette | `cmdk` (Ctrl/Cmd+K CommandPalette) |
| Charts | Recharts |
| Motion | Framer Motion |
| Rich text | Tiptap 3 (starter-kit, link, placeholder) + `dompurify` sanitization |
| Icons | lucide-react |
| Dates | date-fns |

> **Correction to older docs:** the root README previously claimed React 19, React Router v7
> and Tailwind v4. The actual pinned versions are React **18**, React Router **6**, Tailwind **3**
> (see `nexus-frontend/package.json`). These are the versions this reference documents.

---

## 4. Local setup & runbook

```bash
# Backend
cd nexus-backend
npm install
cp .env.example .env        # DATABASE_URL, JWT_SECRET, RESEND_API_KEY?, RAZORPAY_*?, CLOUDINARY_*?
npx prisma migrate deploy   # applies all 5 migrations (see §6)
npx prisma generate
npm run prisma:seed         # permissions + default Admin + baseline catalog
npm run dev                 # http://localhost:4000

# Frontend
cd nexus-frontend
npm install
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:4000/api
npm run dev                 # http://localhost:5173
```

Backend env keys live in `nexus-backend/src/config/env.ts`; the frontend API base is read
from `VITE_API_BASE_URL`. `GET /health` returns `{ success: true, data: { status: 'ok' } }`.

---

## 5. Database architecture

Source of truth: `nexus-backend/prisma/schema.prisma`. Provider: **PostgreSQL**.

### 5.1 Domain map

| Domain | Models |
|---|---|
| Identity & access | `User`, `Role`, `Permission`, `RolePermission` |
| Catalog / CMS | `Category`, `Service`, `ServiceMedia`, `SubService`, `ServiceQuestionnaire`, 12 normalized content tables, `PortfolioProject`, `PortfolioProjectMedia` |
| Sales pipeline | `Lead`, `LeadService`, `LeadSubService`, `LeadActivityNote` |
| Master client | `Client` |
| Commercial | `Quotation`, `QuotationVersion`, `QuotationItem`, `QuotationApproval`, `Project`, `ProjectService`, `ProjectSubService`, `ProjectMedia`, `Invoice`, `InvoiceItem`, `Payment`, `InvoiceNumberSequence` |
| Supporting | `Document`, `Conversation`, `Message` |
| Config | `CompanySetting` (singleton) |
| Auth flows | `OtpVerification`, `PasswordResetToken` |
| Observability | `TimelineEvent`, `AuditLog`, `NotificationEvent`, `NotificationLog`, `InAppNotification`, `StatusTransitionLog` |
| Inbox | `ContactMessage` |

### 5.2 Models (tables)

**Identity & access**
- `users` — Admin/staff accounts. `email` unique, `phone`, `passwordHash`, `roleId`, `isActive`, soft `deletedAt`.
- `roles`, `permissions`, `role_permissions` — RBAC. `RolePermission` is unique on `(roleId, permissionId)`.

**Catalog & CMS**
- `categories` — self-referencing tree (`parentCategoryId`), `isActive`.
- `services` — the core offer. `slug` unique (SEO URL, backfilled from `name`), `categoryId`, `basePrice`, `requiresSiteVisit` (`YES|NO|OPTIONAL`), `publicationState` (`DRAFT|PUBLISHED`), `isActive`, `isFeatured`, `isPopular`, `sortOrder`, four optional image columns (`imageUrl`, `bannerImage`, `thumbnail`, `heroImage`), `estimatedDuration`, soft `archivedAt`/`deletedAt`. Rich content lives in normalized child tables (below); the API reassembles the legacy `{ features, whatsIncluded, process, faqs, testimonials, seo }` shape for public callers.
- `service_media` — marketing gallery (IMAGE/VIDEO) for a service: `url`, `posterUrl`, `altText`, `caption`, `sortOrder`, `isFeatured` (at most one), `isActive` visibility toggle. Independent from project photos and sub-service galleries.
- `sub_services` — distinct offers under a service, exposed at `/services/:serviceSlug/:subSlug`. `slug` unique **per service** (`@@unique([serviceId, slug])`), `shortDescription`, `description`, `icon`, `heroImage`, `startingPrice`, `completionTime`, `publicationState`, `sortOrder`, soft delete. Content in child tables; gallery via `sub_service_media`.
- `service_questionnaires` — JSON `schema` per `(serviceId, version)`; `isActive`; versioned.
- **Phase 13 normalized content tables** (each carries `sortOrder`; all cascade-delete with their parent):
  - `service_features`, `service_included_items`, `service_process_steps` (title/description), `service_faqs` (question/answer), `service_testimonials` (name/role/company/content/rating/avatar)
  - `service_seo` — 1:1 row: `seoTitle`, `metaDescription`, `metaKeywords`, `ogImage`, `canonicalUrl`, `structuredData` (JSON-LD JSON)
  - `sub_service_features`, `sub_service_included_items`, `sub_service_process_steps`, `sub_service_faqs`, `sub_service_media`, `sub_service_seo` (same shapes)
- `portfolio_projects` — CMS-curated showcase work, independent of the derived `/api/portfolio` endpoint. `slug` unique, `serviceId` optional (SET NULL), `isActive`, `sortOrder`, `clientName`, `location`, `projectDate`, `link`, media via `portfolio_project_media`.

**Sales pipeline**
- `leads` — an individual service enquiry. `leadNumber` unique, `contactName`, `phone`, `email`, `companyName`, `source` (default `WEBSITE`), `convertedAt`, optional `clientId` (the master Client this Lead belongs to), `deletedAt`, archive fields (`archivedAt`, `archivedById`, `archiveReason`).
- `lead_services` — one service pinned on a Lead. `status` (default `NEW`), `convertedAt` (when attached to the Client), `questionnaireVersionId` + `questionnaireAnswers`, site-visit overrides. Repeat conversions only attach not-yet-attached services — never duplicate Clients.
- `lead_sub_services` — junction `(leadServiceId, subServiceId)` unique: one service, many sub-services.
- `lead_activity_notes` — admin notes with `authorUserId`.

**Master client**
- `clients` — the master customer profile. `clientNumber` unique, `contactName`, `phone`, `email` unique, `passwordHash`, `gstin`, `sourceLeadId` unique (origin Lead), `isActive`, `lastLoginAt`, soft `deletedAt`. Owns conversations, documents, invoices, payments, projects, quotations. `existingLeads` lists every Lead that repeated enquiry created against it.

**Commercial**
- `quotations` — client-owned. `quotationNumber` unique, `leadId` + `clientId`, `status` (`DRAFT|SENT|NEGOTIATION|APPROVED|REJECTED|ACCEPTED`), `activeVersionId`, `pdfUrl`/`pdfGeneratedAt`, `validUntil`, `notes`, `termsAndConditions`, `paymentTerms`. **XOR rule:** exactly one of `leadId`/`clientId` is non-null (`CHECK` constraint) — new quotations always carry `clientId`.
- `quotation_versions` — versioned line-item sets. `versionNumber` unique per quotation, `isActive`, `subtotal`, `discount`, `gstAmount`, `transportation`, `installation`, `grandTotal`, `createdByUserId`, approvals + items below.
- `quotation_items` — a line: `serviceId`, optional `subServiceId` (ON DELETE SET NULL), `description`, `quantity`, `unit` (default `None`), `unitPrice`, `taxRate`, `taxAmount`, `lineTotal`, denormalized `serviceName`, `hsnSacCode`.
- `quotation_approvals` — internal approval record: `approvedByUserId`, `approvalMethod` (`PHONE|WHATSAPP|EMAIL|IN_PERSON`), `approvedAt`.
- `projects` — auto-created from an ACCEPTED quotation. `projectNumber` unique, `leadId`, `clientId`, optional `quotationId` (origin, SET NULL), optional `title`, `completedAt` + `completedByUserId` (the single "mark complete" moment that publishes to the public portfolio), soft `deletedAt`.
- `project_services` — service work packages under a project; `status` (default `PROJECT CREATED`), optional `assignedQuotationVersionId`, `leadServiceId`.
- `project_sub_services` — junction `(projectServiceId, subServiceId)` unique, derived from the accepted quotation.
- `project_media` — completion gallery (IMAGE/VIDEO/DOCUMENT) for the public portfolio: `posterUrl`, `title`, `altText`, `caption`, `fileName`, `mimeType`, `fileSize`, `sortOrder`, `isFeatured`, `isActive`.
- `invoices` — `invoiceNumber` unique (gapless, FOR UPDATE via `InvoiceNumberSequence`), `projectId`, `clientId`, `label`, `status` (`DRAFT|ISSUED|CANCELLED`), `cancelReason`, `subtotal`, `gstAmount`, `grandTotal`, `issuedAt`, `createdByUserId`, `pdfUrl`/`pdfGeneratedAt`.
- `invoice_items` — line: `description`, `quantity`, `unit`, `unitPrice`, `hsnSacCode`, `taxRate`, `taxAmount`, `lineTotal`.
- `payments` — `invoiceId`, `clientId`, `projectId`, `amount`, `method`, `status` (`PENDING|SUCCESS|FAILED|REFUNDED`), `referenceNote`, `recordedByUserId`, `paidAt`, `transactionReference`, gateway columns (`gatewayMetadata`, `gatewayPaidAt`, `gatewayPaymentUrl`, `gatewayStatus`, `gatewayTransactionId`), receipt columns (`receiptGeneratedAt`, `receiptUrl`, `receiptSentAt`). **Idempotency:** unique on `gatewayTransactionId` and on `transactionReference` (nullable → offline payments unaffected).
- `invoice_number_sequences` — per `financialYear`, `lastNumber`.

**Supporting**
- `documents` — generic attachment store keyed by `(entityType, entityId)` (LEAD/CLIENT/PROJECT/QUOTATION/INVOICE/PAYMENT etc.), with optional `clientId` and `projectRefId` for portal scoping.
- `conversations` / `messages` — client messaging. `Conversation` ties to `clientId` (+ optional `projectId`); `Message` has `senderType` (`ADMIN`|`CLIENT`), `senderUserId`/`senderClientId`, `isRead`.

**Config**
- `company_settings` — singleton row (id `'singleton'`): company info, business settings (currency `INR` default, `currencySymbol` ₹ default, timezone, date format), document prefixes (`INV`/`QUO`/`PRJ`/`CLI`/`LD`), `defaultGstPercent` (18), bank details, UPI/QR, email settings, social links.

**Auth flows**
- `otp_verifications` — `email` unique, `hashedOtp` (bcrypt), `expiresAt`, `verifiedAt`, `attempts` (max 5), one active OTP per email (resend invalidates).
- `password_reset_tokens` — `email`, `tokenHash`, `expiresAt` (1h), `usedAt`.

**Observability**
- `timeline_events` — user/business-facing history per `(entityType, entityId)`. `eventType`, `description`, optional `actorUserId`, `metadata` (JSON), `clientVisible` (default true; business-vs-system split enforced at the source — system events go to the audit log), and `dedupeKey` (payment-scoped idempotency, see schema comment). Indexed on `(entityType, entityId, eventType, dedupeKey)`.
- `audit_logs` — immutable system change trail: `entityType`, `entityId`, `action`, `actorUserId`, `beforeState`/`afterState` (JSON).
- `notification_events` / `notification_logs` — outbound event fan-out: each event records delivery per `channel`/`recipient` with `status`, `sentAt`, `errorMessage`. Payment events carry `dedupeKey`.
- `in_app_notifications` — portal/admin inbox rows: `recipientId` + `recipientType`, `type` (`INFO|SUCCESS|WARNING|ERROR`), `priority` (`LOW|NORMAL|HIGH|URGENT`), `relatedEntity`/`relatedEntityId`/`actionUrl`, `isRead`/`readAt`. Indexed on `(recipientId, recipientType, createdAt)`.
- `status_transitions_log` — `entityType`, `entityId`, `fromStatus`, `toStatus`, `actorUserId`, `reason`.

**Inbox**
- `contact_messages` — public /contact submissions, triaged by admins. `status` (`NEW|READ|REPLIED|ARCHIVED`), `replyBody`/`repliedAt`/`repliedById`, `archivedAt`. Deliberately standalone — never auto-creates Leads or Clients.

### 5.3 Enums

| Enum | Values |
|---|---|
| `SiteVisitRequirement` | `YES`, `NO`, `OPTIONAL` |
| `MediaType` | `IMAGE`, `VIDEO` |
| `ProjectMediaType` | `IMAGE`, `VIDEO`, `DOCUMENT` |
| `QuotationStatus` | `DRAFT`, `SENT`, `NEGOTIATION`, `APPROVED`, `REJECTED`, `ACCEPTED` |
| `ApprovalMethod` | `PHONE`, `WHATSAPP`, `EMAIL`, `IN_PERSON` |
| `PaymentStatus` | `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED` |
| `InvoiceStatus` | `DRAFT`, `ISSUED`, `CANCELLED` |
| `PublicationState` | `DRAFT`, `PUBLISHED` (Phase 12) |
| `ContactMessageStatus` | `NEW`, `READ`, `REPLIED`, `ARCHIVED` (Phase 12) |

### 5.4 Key relations & ownership

```
Lead ──sourceLeadId──→ Client (origin; unique)       Client ←─clientId── existing Leads (repeat enquiries)
Service ──categoryId──→ Category
Service ──slug──→ public /services/:slug            SubService ──(serviceId, slug)──→ /services/:slug/:subSlug
LeadService ──serviceId──→ Service                  LeadService ──lead_sub_services──→ SubService (many)
Quotation ──clientId──→ Client  ·  ──leadId──→ Lead (XOR)
Quotation ──versions──→ QuotationVersion ──items──→ QuotationItem (──subServiceId──→ SubService, SET NULL)
Project ──quotationId──→ Quotation (origin, SET NULL)
Project ──project_services──→ ProjectService ──project_sub_services──→ SubService (derived from accepted quote)
Project ──invoices──→ Invoice ──payments──→ Payment
Client / Project ──documents──→ Document   Client ──conversations──→ Conversation ──messages──→ Message
```

Ownership rules enforced in the service layer:
1. **Client is the master profile.** The Client's `contactName`/`phone`/`email`/`companyName`/`gstin` are the canonical values.
2. **A Lead is a single request.** Repeat enquiries from the same person create *new* Leads linked to the *same* Client (`clientId` on `leads`); they never overwrite the Client profile.
3. **Quotations require a Client.** Creation with only a `leadId` is rejected; `quotation.service` refuses unconverted Leads.
4. **Projects are born from accepted quotations.** `project.service.create()` validates the quotation is `ACCEPTED`, copies services, derives `project_sub_services` from the accepted line items, and applies `PROJECT CREATED` status.
5. **Completed projects feed the public portfolio.** `completedAt` is set once by the explicit "mark complete" action; completed projects and their media appear automatically on the public site. The CMS `portfolio_projects` showcase is separate and curated.

### 5.5 Observability model

- **Timeline** = history of an entity (what happened, client-visible).
- **Audit log** = immutable system/change trail (who changed what, before/after).
- **Notifications** = items requiring attention (in-app + email).
- **Status transitions** = explicit `status_transitions_log` rows on status changes.

Every state-changing action follows: **Validation → Authorization → Transaction → Timeline → Audit → Notification → Response**. Timeline/audit/notification writes are fire-and-forget and never block the business transaction.

---

## 6. Migration history

All migrations are committed under `nexus-backend/prisma/migrations/` and applied in order:

| # | Migration | Purpose |
|---|---|---|
| 1 | `20260701000000_initial_baseline` | Full baseline schema (identity, catalog, pipeline, commercial, supporting, observability, company settings, OTP/password-reset). |
| 2 | `20260807183241_phase12_admin_ux` | Adds `PublicationState` + `ContactMessageStatus` enums; adds `publicationState` to `services`/`sub_services` (default `PUBLISHED`); creates `contact_messages` + `(status)` and `(status, createdAt)` indexes; sets `company_settings.currencySymbol` default to `₹`. |
| 3 | `20260809172248_phase13a_cms_normalized_tables` | Creates the 12 normalized CMS tables + `portfolio_projects` + `portfolio_project_media` with FKs (CASCADE for content, SET NULL for portfolio→service); **backfills** existing JSON content into child tables inside the migration transaction (`sortOrder` = array index so assembled shapes keep exact ordering). Legacy columns are *not* dropped here. |
| 4 | `20260809230124_phase13b_drop_legacy_json_columns` | Drops the legacy flat/JSON columns from `services` (11 columns: seoTitle, metaDescription, metaKeywords, ogImage, canonicalUrl, structuredData, features, whatsIncluded, process, faqs, testimonials) and `sub_services` (11: gallery + the same SEO/JSON set). |
| 5 | `20260810201946_phase16_performance_indexes` | 25 supporting indexes across `audit_logs`, `clients`, `conversations`, `documents`, `in_app_notifications`, `invoice_items`, `invoices`, `lead_services`, `leads`, `messages`, `payments`, `project_services`, `projects`, `quotation_items`, `quotation_versions`, `quotations`, `timeline_events`. |

`migration_lock.toml` pins the provider to `postgresql`.

---

## 7. Backend architecture

### 7.1 Request lifecycle

`src/app.ts` (`createApp()`):
1. `applySecurityMiddleware` (helmet, CORS, rate limits)
2. Raw body for `POST /api/payments/webhook` (signature verification over exact bytes) — mounted before `express.json()`
3. `express.json()`, request logger
4. Route mounts (§8), `/uploads` static, SEO routes at root (`sitemap.xml`, `robots.txt`)
5. `notFoundHandler` → `errorHandler` (typed `AppError` hierarchy → structured `{ success, error }` JSON)

### 7.2 Auth & RBAC

- `authenticate` (JWT Bearer) and `authenticateOptional` (public endpoints that also serve the admin UI) middleware; `authorize('permission.key')` checks the user's role→permission set; `requireActorType('CLIENT')` guards client-only actions.
- Public (no auth): category tree, service list/detail/questionnaire/sub-services/media, lead creation, contact submission, `/api/public/auth/*` OTP flow, `/api/auth/login|forgot-password|reset-password`, portfolio, `/uploads`, sitemap/robots, `GET /api/company/settings`.
- Client (JWT from portal login): `/api/*/me` endpoints, quotation accept/reject/request-revision, payment create-order/verify, own notifications/documents/messages.
- Admin (JWT + permission): everything else.

### 7.3 Module inventory (23 modules)

`auth`, `audit`, `catalog` (categories, services, sub-services, service media), `client`, `company`, `contact`, `dashboard`, `documents`, `email` (channel + templates), `entity-ref`, `invoice`, `lead`, `messages` (conversations), `notifications`, `otp` (public auth), `payments`, `pdf`, `project` (projects + portfolio + project media), `quotation`, `search`, `seo`, `status-engine`, `timeline`.

Each module follows `.routes.ts → .controller.ts → .service.ts → .repository.ts → .validation.ts → .types.ts`.

### 7.4 Security & middleware

- Helmet headers; CORS; `express-rate-limit` on auth/OTP endpoints.
- bcrypt for passwords **and** OTP hashes (10-min expiry, max 5 attempts, 60s resend limit, one active OTP per email).
- Password reset tokens: 1-hour expiry, single-use, hashed at rest.
- Payments: database-level idempotency (unique gateway/transaction refs) + webhook signature verification over the raw body.

---

## 8. API reference

Base URL: `http://localhost:4000/api` (frontend reads `VITE_API_BASE_URL`). Every response is
`{ success, data }` (or `{ success, error }`). Auth = `Authorization: Bearer <jwt>`.

### Public (no auth)
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check (app root, not under `/api`) |
| POST | `/public/auth/send-otp` | Send 6-digit OTP to email |
| POST | `/public/auth/verify-otp` | Verify OTP (bcrypt-hashed) |
| POST | `/public/auth/check-email` | Wizard existing-user detection |
| POST | `/public/auth/check-account` | Existing-client detection for repeat enquiries |
| POST | `/public/auth/send-otp-login` | OTP login for existing clients |
| POST | `/public/auth/verify-otp-login` | Verify OTP login |
| GET | `/categories` | Category tree |
| GET | `/services` | Service list (active + PUBLISHED for public; admin sees more via auth) |
| GET | `/services/:id` | Service detail (`:id` = UUID for admin, slug for public) |
| GET | `/services/:id/questionnaire` | Service questionnaire schema |
| GET | `/services/:id/sub-services` | Sub-services (active + PUBLISHED) |
| GET | `/services/:id/media` | Service gallery (visible items) |
| POST | `/leads` | Create Lead (wizard submission; optional account creation) |
| GET | `/portfolio` | Public portfolio derived from completed projects |
| GET | `/portfolio/summary` | Portfolio counts/stats |
| POST | `/contact-messages` | Contact/support inbox submission |
| GET | `/company/settings` | Company branding (used by public site; optional auth) |
| GET | `/sitemap.xml`, `/robots.txt` | SEO files at app root |
| GET | `/uploads/*` | Static local file serving |

### Auth (admin/staff)
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Login (admin or client) |
| POST | `/auth/logout` | Logout (authenticated) |
| GET | `/auth/me` | Current user |
| POST | `/auth/change-password` | Change own password |
| POST | `/auth/forgot-password` | Request reset |
| POST | `/auth/reset-password` | Reset with token |

### Catalog (admin: `service.manage` / `category.manage`)
| Method | Path | Purpose |
|---|---|---|
| POST/PUT/PATCH/DELETE | `/categories` `/categories/:id` `/categories/:id/disable` | Category CRUD |
| POST/PUT/PATCH | `/services` `/services/:id` | Service create/update (update = PUT/PATCH) |
| POST/DELETE | `/services/:id/image` `/services/:id/image` | Upload / remove service image |
| PATCH | `/services/:id/disable|archive|restore|publish|draft` | Toggle states |
| POST | `/services/bulk` | Bulk create/update |
| DELETE/POST | `/services/:id` `/services/:id/undelete` | Soft delete / undelete |
| POST | `/services/:id/duplicate` | Duplicate service (with content) |
| POST | `/services/:id/media/upload` | Upload gallery file |
| POST | `/services/:id/media/:mediaId/poster` | Set video poster |
| POST/PATCH | `/services/:id/media` `/services/:id/media/:mediaId` | Create / update gallery item |
| PATCH | `/services/:id/media/:mediaId/toggle-active` | Visibility toggle |
| POST | `/services/:id/media/reorder` | Reorder gallery |
| POST | `/services/:id/media/:mediaId/feature` | Set featured item |
| DELETE | `/services/:id/media/:mediaId` | Remove gallery item |
| POST | `/services/:id/sub-services` | Create sub-service |
| POST | `/services/:id/sub-services/reorder` `/bulk` | Reorder / bulk |
| PUT/PATCH | `/services/:id/sub-services/:subId` | Update sub-service |
| POST/DELETE | `/services/:id/sub-services/:subId/image` | Upload / remove sub-service image |
| PATCH | `/services/:id/sub-services/:subId/disable|archive|restore|publish|draft` | Sub-service states |
| DELETE/POST | `/services/:id/sub-services/:subId` `/undelete` `/duplicate` | Sub-service soft delete / undelete / duplicate |

### Leads (public create; admin `lead.view`/`lead.edit`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/leads` | Public lead creation |
| GET | `/leads` | List (paginated, archived filter) |
| GET | `/leads/:id` | Detail |
| PATCH | `/leads/:id` | Update |
| POST | `/leads/:id/services` | Add service to lead |
| PATCH | `/leads/:leadServiceId/status` | Update lead-service status (blocked after conversion) |
| POST | `/leads/:id/notes` | Add activity note |
| GET | `/leads/:id/notes` | List notes |
| PATCH | `/leads/:id/archive` | Archive (mandatory reason) |
| PATCH | `/leads/:id/restore` | Restore |

### Clients (admin `client.view`/`client.edit`; portal `authenticate`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/clients/me` | Own profile (portal) |
| POST | `/clients/convert/:leadId` | Convert Lead → Client (`client.convert`) |
| GET | `/clients` | List |
| POST | `/clients/:id/reset-password` | Reset client password + email |
| POST | `/clients/:id/send-welcome` | Resend welcome email |
| PATCH | `/clients/:id/active` | Toggle active |
| GET | `/clients/:id/summary` | Summary (counts across modules) |
| GET | `/clients/:id/leads` | Service-history Leads |
| GET | `/clients/:id/services` | Client services |
| GET | `/clients/:id` | Detail |
| PATCH | `/clients/:id` | Update master profile |

### Quotations (admin `quotation.create`/`view`/`approve`; portal `authenticate`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/quotations` | Create (client-owned) |
| GET | `/quotations` | List (admin) |
| GET | `/quotations/me` | List for portal client |
| GET | `/quotations/me/:id` | Portal detail |
| GET | `/quotations/:id` | Admin detail |
| POST | `/quotations/:id/revise` | Revise (new version) |
| POST | `/quotations/:id/send` | Send (email + QUOTE_SENT) |
| POST | `/quotations/:id/accept` | Client accept → ACCEPTED + project auto-created |
| POST | `/quotations/:id/reject` | Client reject → NEGOTIATION |
| POST | `/quotations/:id/request-revision` | Client request revision → NEGOTIATION |
| POST | `/quotations/versions/:versionId/approve` | Internal approval |

### Projects (admin `project.*`; portal `authenticate`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/projects` | Create from ACCEPTED quotation (or manual) |
| GET | `/projects` | List (admin) |
| GET | `/projects/me` `/projects/me/:id` | Portal views |
| GET | `/projects/:id` | Admin detail |
| POST | `/projects/:id/services` | Add service |
| PATCH | `/projects/:id` | Update title |
| PATCH | `/projects/services/:projectServiceId/status` | Service status |
| POST | `/projects/:id/complete` | Mark complete (`completedAt` set) |
| GET | `/projects/:id/media` | List media |
| POST | `/projects/:id/media/upload` | Upload file |
| POST | `/projects/:id/media/:mediaId/poster` | Set poster |
| POST | `/projects/:id/media` | Create item |
| PATCH | `/projects/:id/media/:mediaId` | Update |
| POST | `/projects/:id/media/reorder` | Reorder |
| POST | `/projects/:id/media/:mediaId/feature` | Set featured |
| DELETE | `/projects/:id/media/:mediaId` | Remove |

### Invoices & payments (admin `invoice.*`; portal `authenticate`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/invoices` | Create |
| GET | `/invoices` | List (admin) |
| GET | `/invoices/me` `/invoices/me/summary` `/invoices/me/:id` | Portal views + summary |
| GET | `/invoices/project/:projectId` | List for project |
| GET | `/invoices/project/:projectId/financial-summary` | Project financials |
| GET | `/invoices/:id` | Detail |
| POST | `/invoices/:id/send` | Send (email) |
| PATCH | `/invoices/:id/cancel` | Cancel (number preserved) |
| POST | `/invoices/:id/payments` | Record offline payment |
| GET | `/invoices/:id/payments` | Payment history |
| POST | `/invoices/:id/payments/:paymentId/send-receipt` | Send receipt email |
| POST | `/invoices/:id/payments/:paymentId/resend-receipt` | Resend receipt email |
| POST | `/payments/create-order` | Razorpay order (CLIENT) |
| POST | `/payments/verify` | Verify payment (CLIENT) |
| POST | `/payments/:paymentId/refund` | Refund (admin) |
| GET | `/payments` | Payment ledger (filters + pagination) |
| POST | `/payments/webhook` | Razorpay webhook (raw body) |

### Supporting (documents, messages, search, dashboards, observability, settings, PDF)
| Method | Path | Purpose |
|---|---|---|
| POST | `/documents` | Upload (`document.upload`) |
| GET | `/documents/me` `/documents/all` `/documents/entity/:entityType/:entityId` `/documents` | Lists |
| GET | `/documents/:id/download` | Download |
| DELETE | `/documents/:id` | Remove |
| GET | `/conversations` | All conversations (`message.view`) |
| POST/GET/PATCH | `/conversations/:clientId/messages` `/conversations/:clientId/messages` `/conversations/:clientId/messages/read` | Messaging |
| GET | `/search?q=&type=` | Global search (3-char min, `search.use`) |
| GET | `/dashboard/admin/summary` | Admin KPIs + charts (`dashboard.view`) |
| GET | `/dashboard/client/summary` | Portal dashboard |
| GET | `/timeline` `/timeline/:entityType/:entityId` | Timeline feed |
| GET | `/audit-logs` `/audit-logs/:entityType/:entityId` | Audit log (`audit.view`) |
| GET | `/notifications` `/notifications/unread-count` | In-app notifications |
| PATCH | `/notifications/read-all` `/notifications/:id/read` | Mark read |
| GET | `/company/settings` | Settings (optional auth) |
| PATCH | `/company/settings` | Update (admin) |
| POST | `/company/settings/upload?field=` | Upload branding file |
| POST | `/pdf/generate` | Generate PDF (`quotation.create`) |
| GET | `/pdf/:documentType/:documentId` | Download PDF (QUOTATION/INVOICE/RECEIPT) |
| POST | `/pdf/:documentType/:documentId/regenerate` | Regenerate PDF |
| GET | `/contact-messages/counts` | Inbox counts (`support.manage`) |
| GET | `/contact-messages` `/contact-messages/:id` | Inbox list/detail |
| PATCH | `/contact-messages/:id/read` | Mark read |
| POST | `/contact-messages/:id/reply` | Reply by email |
| PATCH | `/contact-messages/:id/archive` `/restore` | Archive / restore |

---

## 9. Frontend architecture

### 9.1 App shell & routing

Three areas, wired in `src/App.tsx` using React Router 6:

1. **Public website** — `<PublicLayout>` at `/` (and `/services`, `/services/:slug(/:subSlug)`, `/industries`, `/how-it-works`, `/projects`, `/about`, `/contact`, `/get-quote`). The `resources` route is present in code but disabled.
2. **Admin CRM** — `<ProtectedRoute>` (ADMIN) + `<AdminLayout>` under `/admin/*` with 21 page areas (dashboard, leads, clients, quotations, services, categories, projects, invoices, payments, messages, support, documents, notifications, timeline, audit-logs, search, settings, company settings, design system, + detail pages).
3. **Client portal** — `<PortalProtectedRoute>` (CLIENT) + `<PortalLayout>` under `/portal/*` (dashboard, quotations, projects, invoices, messages, documents, notifications, service-request).
4. Shared auth pages (`/login`, `/forgot-password`, `/reset-password`), legacy redirects (`/leads → /admin/leads`, etc.), and a 404.

`src/routes/routes.ts` is the single source of truth for every path.

**Phase 16 code splitting:** every admin/portal/public page is `React.lazy()`-loaded in its own chunk (named→default export mapping), so the initial bundle is no longer a single ~2.2 MB chunk. Auth + error pages stay eager. A `<Suspense>` spinner fallback is provided.

### 9.2 Data layer

- `src/services/*` — typed API clients (auth, client, company, contact, dashboard, documents, invoice, lead, message, notification, payment, portfolio, project, publicAuth, quotation, search, serviceCatalog, timeline, audit). Shared HTTP helper in `src/lib/api.ts` handles auth headers, `{ success, data }` unwrapping, and paginated envelopes.
- `src/queries/*` — TanStack Query hooks + `queries/keys.ts` factories (useLeads, useClients, useQuotations, useProjects, useInvoices, usePayments, useServices, usePublicServices, usePublicSubServices, usePortfolio, useDocuments, useMessages, useNotifications, useTimeline, useAuditLogs, useSearch, useCompany, useContactMessages).
- `src/app/providers.tsx` — global providers (QueryClient, theme, AuthContext, DynamicFavicon).

### 9.3 UI kit & design system

- Radix-based components in `src/components/ui/`: Button, Card, Input, Textarea, Select, DropdownMenu, Modal, Drawer, Tabs, Switch, Checkbox, Tooltip, Avatar, DataTable, FilterBar, Pagination, StatusBadge, StatCard, Charts, ActivityFeed, Timeline, Breadcrumbs, CommandPalette, ConfirmDialog, EmptyState, ErrorState, Skeleton, Toaster, SaveIndicator, FormField, SearchInput.
- Layout: `AppShell`, `TopNav`, `Sidebar`, `NotificationPanel`, `CompanyLogo`, `DynamicFavicon`.
- Dark mode: Tailwind class strategy, Light/Dark/System toggle persisted in localStorage with a FOUC-prevention script; semantic tokens (`bg-surface`, `bg-canvas`, `text-ink`) used across the public site.

### 9.4 Public website module (`src/public-site/`)

Self-contained: `pages/` (11 pages), `sections/`, `components/`, `layouts/PublicLayout`, `wizard/`, `hooks/`, `seo/` (SEO head management), `lib/`, `types/`, `constants/`.

### 9.5 Get Quote wizard (`src/public-site/wizard/`)

Driven by `useWizardState.ts` — active steps (`STEP_LABELS`):

**Services → Questions → Contact → Review → Account → Verify → Submit**

- `StepServices` / `StepServicesPreselected` — service + **multiple sub-service** selection (deep-link preselection via `/get-quote?service=:slug&sub=:subSlug`).
- `StepQuestions` — dynamic questionnaire rendered from the service's `ServiceQuestionnaire.schema` (`QuestionRenderer.tsx`, `serviceQuestions.ts`).
- `StepContact` — contact details (name/phone/email/company).
- `StepReview` — summary with edit-back.
- `StepAccount` — password creation + email verification via OTP (`StepOtp`).
- `StepLogin` — existing-user path (detected via `/public/auth/check-email` + `check-account`).
- `StepSubmit` — POST `/leads` (with account creation), then confirmation.
- `StepUploads` exists in code but is **not** part of the active flow (removed in Phase 12).

---

## 10. Public website flows

### 10.1 Service discovery
1. Home → `/services` lists categories + services (active + PUBLISHED, `shortDescription`, image/icon fallback).
2. `/services/:slug` — service detail: hero, features, whats-included, process, FAQs, testimonials, gallery (`service_media`), sub-service nav cards, CTA to the wizard with that service preselected.
3. `/services/:slug/:subSlug` — sub-service detail at its own SEO URL (description, features, included, process, FAQs, gallery).
4. `/projects` — public portfolio from completed projects; CMS-curated `portfolio_projects` also supported.

### 10.2 Get Quote wizard
New visitor → OTP email verification → account created (bcrypt password) → Lead created. Existing client → detected (`check-account`), logged in via OTP, new Lead linked to the same Client, **master profile untouched**. Submission creates the Lead in one transaction; if the Lead's first service qualifies, the wizard can auto-create the Client.

### 10.3 Contact page
`/contact` posts to `/api/contact-messages` (public). Messages land in the admin **Support** inbox (`/admin/support`) with NEW→READ→REPLIED→ARCHIVED lifecycle; admins reply by email.

---

## 11. Admin guide

- **Dashboard** (`/admin`) — 10 KPI cards, 4 charts (lead-services by status, leads by source, monthly revenue, projects by status), recent activity, upcoming items, quick actions, Ctrl/Cmd+K global search.
- **Leads** (`/admin/leads`) — Active/Archived tabs; qualify services through the pipeline (NEW → CONTACTED → QUALIFIED → SITE_VISIT → QUOTE_PREPARING); add notes; archive with reason; **Convert to Client** (requires a qualified service + valid email; first conversion creates the Client + credentials, repeat conversions attach remaining services to the existing Client).
- **Clients** (`/admin/clients`) — master profile (edit name/phone/email/company/GSTIN), reset password, resend welcome email, deactivate/reactivate, service history (all Leads), summary, documents.
- **Quotations** (`/admin/quotations`) — create for a Client (client-owned only), versioned revise, internal approval, send (email + PDF), status watermark PDFs.
- **Projects** (`/admin/projects`) — created from accepted quotations; per-service status (`PROJECT CREATED → IN_PROGRESS → ON_HOLD → COMPLETED → CANCELLED`), title edit, completion media (upload/reorder/featured/poster), "Mark complete" publishes to the public portfolio.
- **Invoices & Payments** (`/admin/invoices`, `/admin/payments`) — issue, send, cancel (number preserved), record offline payments (with transaction reference, overpayment rejected), payment ledger with filters, send/resend receipts.
- **Services & Categories** (`/admin/services`, `/admin/categories`) — full CMS (§13).
- **Messages** (`/admin/messages`) — client conversations. **Support** (`/admin/support`) — contact inbox.
- **Documents** (`/admin/documents`) — uploads keyed by entity.
- **Timeline / Audit Logs / Notifications** — observability views.
- **Settings → Company** (`/admin/settings/company`) — company info, business settings (currency, prefixes, GST%), bank/UPI, email, social; branding file uploads (logo, favicon, signature, stamp, QR). The public site, PDFs and emails consume this as the single source of truth.

---

## 12. Client portal & data ownership

- **Portal** (`/portal`) — dashboard summary, quotations (PDF as single source of truth; accept/reject/request-revision), projects (+timeline), invoices (pay online via Razorpay when outstanding), documents, messages, notifications, and **Request a Service** (new service request → new Lead under the same Client).
- **Data ownership (Client vs Lead):**
  - **Client** = master profile. Created once (from the origin Lead), `sourceLeadId` links back for traceability. Portal login credentials belong to the Client.
  - **Lead** = a single request. Repeat enquiries / portal service requests always create a new Lead linked to the existing Client (`leads.clientId`); the Client profile is **never** overwritten by a Lead's contact values.
  - Verified end-to-end by `nexus-backend/scripts/verify-data-ownership.js` (4 tests: new client, returning client, many leads under one client, admin detail history).
- **Access isolation:** portal endpoints (`/me` routes, documents, messages, quotations, projects, invoices) are scoped to the authenticated Client.

---

## 13. CMS capabilities

All service content is admin-managed in `/admin/services` (and `/admin/categories`):

- **Service** record: name, slug, category, description + shortDescription, icon, basePrice, site-visit requirement, **publish state** (DRAFT never public), active/archive/soft-delete, featured/popular/sortOrder, images (image/banner/thumbnail/hero), estimated duration.
- **Content blocks** (normalized tables, Phase 13): Features, What's Included, Process steps, FAQs, Testimonials — each with ordering and delete-in-place.
- **SEO** (1:1 `service_seo` / `sub_service_seo`): title, meta description, keywords, OG image, canonical URL, structured data JSON-LD.
- **Gallery** (`service_media`): images + videos, poster, alt/caption, sortOrder, featured flag, visibility toggle.
- **Sub-services**: full nested CMS (same content-block model, `sub_service_media` gallery, own SEO), with reorder/duplicate/bulk operations.
- **Portfolio** (`portfolio_projects`): curated showcase projects with cover, gallery, location/date/link, optional service link for "Related Projects", active toggle. Independent of the derived public portfolio.
- **Duplicate** service / sub-service (content + media) for fast authoring.

---

## 14. Payments (summary)

See `PAYMENTS.md` for the complete reference. In short:

- **Online:** client pays via Razorpay checkout — `POST /payments/create-order` → Razorpay Checkout.js → `POST /payments/verify` (idempotent) → `POST /payments/webhook` verifies signature over the raw body. A gateway transaction can never create two Payment rows (unique `gatewayTransactionId`).
- **Offline:** admin records payments with a transaction reference (globally unique, nullable so offline refs are optional).
- **Status:** computed automatically (DRAFT → SENT → PARTIALLY PAID → PAID → CANCELLED) — never manual. Overpayments and negative/zero amounts are rejected.
- **Receipts:** generated PDFs, emailed on payment / resendable; timeline entries are payment-scoped via `dedupeKey` so two payments on the same invoice each log correctly.

---

## 15. Phase 16 — performance optimization

- **Database indexes** (`20260810201946_phase16_performance_indexes`): 25 indexes covering the hot query paths (entity history, client/project/invoice lists, conversation/message pagination, payment filters, status lookups).
- **N+1 query fixes:** batch enrichment of quotation line items with service names (`enrichItemsWithServiceNames` at write time + read-time repository enrichment), eliminating per-item catalog lookups.
- **Code splitting:** route-level `React.lazy()` chunks in `src/App.tsx` (see §9.1).
- **Portal pagination:** portal list endpoints return paginated envelopes (`{ items, meta }`) with supporting indexes so client portal lists scale.

---

## 16. Testing & verification status

### Backend (verified on Phase 17)

```bash
cd nexus-backend
npm test        # Jest unit suites — 28 suites, 467 tests PASSING (no DB needed)
npm run build   # tsc -p tsconfig.json
```

- **28 test suites / 467 tests, all passing** (re-run during Phase 17, no DB required): auth, otp, lead, client, quotation, project (+projectMedia, aggregateStatus), invoice (+invoiceNumbering), payments, pdf (+receipt lifecycle), documents, catalog (service, subService, serviceMedia), company, contact, dashboard, search, notifications, timeline (incl. dedupe passthrough), status-engine (service + rules), messages, entity-ref, core error handler.

### End-to-end harnesses (require a running server on :4000 + a real DB)

| Script | Covers |
|---|---|
| `npm run smoke-test` | Golden path (multi-service enquiry → quotation → approval → client conversion → project → invoice → payment) + atomicity rollback, illegal transitions, re-conversion rejection, premature completion, overpayment rejection, invoice-number preservation, catalog visibility |
| `npm run regression:test` (`regression-run.js`) | 9 tests / 83 checks over the full Lead → Client → Quotation → Project lineage, backward compatibility, dedup, DB integrity + orphan-FK scan |
| `npm run verify:backward-compat` (`verify-backward-compat.js`) | Phase 14 audit: 13a/13b applied, no data loss over runs, referential integrity, financial integrity (totals recomputed), Phase 13 assembled API shapes match normalized tables row-for-row |
| `npm run verify:acceptance` (`verify-acceptance.js`) | Quotation acceptance flow under the current client-owned contract (updated in Phase 15) |
| `node scripts/verify-data-ownership.js` | Client master-profile vs Lead ownership (4 tests) |

### Frontend

```bash
cd nexus-frontend
npm run build    # tsc -b && vite build (typecheck + production bundle)
npm run dev      # dev server
```

- TypeScript check and production build pass (verified at the Phase 16/UI pass; the tree is unchanged since — Phase 17 makes no source edits).
- **No frontend test files and no frontend test runner are configured.**

---

## 17. Known limitations

1. **Frontend `npm run lint` fails** — ESLint 8 is installed (`eslint src --ext ts,tsx`) but the repository contains **no ESLint configuration file** (no `.eslintrc*`, no `eslint.config.*`), so lint cannot run. Pre-existing; not a Phase 17 change.
2. **No automated frontend tests** — typecheck (`tsc -b`) and production build are the only automated frontend gates.
3. **Questionnaires are developer-seeded, not admin-editable** — `ServiceQuestionnaire` rows come from `prisma/seed.ts`; there is no admin API to author/edit them at runtime.
4. **Email requires `RESEND_API_KEY`** — without it, emails (OTP, quotation, invoice, receipts, welcome) are silently skipped; the app never errors.
5. **`s3Storage.provider.ts` is a stub** — production deployments should use `cloudinary` or implement S3; `local` storage works for development.
6. **Contact inbox is deliberately standalone** — submissions never auto-create Leads/Clients (keeps the Lead → Client → Project flow intact).
7. **Historical docs contain stale claims** — `nexus-backend/README.md` (pre-frontend era), root `README.md` (React 19/v7/Tailwind v4 claims; "253 tests"), and per-phase counts in `IMPLEMENTATION*.md`. This reference (`ARCHITECTURE.md`) is the corrected authority; the historical files keep their snapshots for provenance.
8. **Commit/phase naming drift** — the numbered phase history in `IMPLEMENTATION-PROGRESS.md` reused numbers across eras (e.g. "Phase 1" appears three times for unrelated work). The git-based Phase 12–17 timeline in §18 is the canonical recent history.

---

## 18. Phase history (Phases 12–17, from `git log`)

| Phase | Commit(s) | What shipped |
|---|---|---|
| Phase 12 | `cf4fe3c` (follow-up "after phase 12, deleted the DB and fix the errors") | **Admin UX**: `PublicationState` enum + `publicationState` on services/sub-services (draft/publish), `ContactMessageStatus` + `contact_messages` inbox (public /contact + admin Support inbox), `currencySymbol` ₹ default. Migration `20260807183241_phase12_admin_ux`. |
| Phase 13 | `a622a02` (commit note: "intended as an internal database normalization, not a redesign") | **CMS normalization**: 13a (`20260809172248`) creates 12 normalized content tables + portfolio tables and backfills the legacy JSON in-transaction; 13b (`20260809230124`) drops the legacy JSON/flat SEO columns after verification. API keeps returning the assembled legacy shapes. |
| Phase 14 | part of `a622a02`/`2f4e2a7` lineage | **Backward compatibility & data-integrity audit**: `verify-backward-compat.js` (schema-change discipline, no data loss, referential + financial integrity, API-shape parity). |
| Phase 15 | `2f4e2a7`, `212aa1f` ("run Phase 15 successfully… previous commit was phase 14 not phase 13") | **Acceptance-flow verification**: `verify-acceptance.js` updated to the current client-owned quotation contract. |
| Phase 16 | `fc21d21`, `32a98ca` | **Performance optimization**: N+1 fixes, route-level code splitting, portal pagination, and the 24-index migration `20260810201946_phase16_performance_indexes`. |
| UI pass (post-16) | `49c7a9f`, `e68278d` | Interaction/UX fixes after Phase 16: multiple sub-service selection + UI polish (`49c7a9f`); dropdown + notification tab hover fixes (`e68278d`) — Select/DropdownMenu/Modal overflow handling, NotificationPanel moved to a self-contained Radix Popover, public navbar sub-service dropdown, sidebar Escape close. Not a numbered phase. |
| **Phase 17** | (working tree, uncommitted) | **Documentation only** — this reference + README/progress updates. No source, schema, migration, API or behavior changes. |

---

## 19. References

- `README.md` — quick start (updated in Phase 17)
- `WORKFLOW.md` — business workflow documentation
- `PAYMENTS.md` — payment architecture & Razorpay integration
- `IMPLEMENTATION.md` / `IMPLEMENTATION-PROGRESS.md` — historical phase notes
- `nexus-backend/docs/` — PRD, Technical Blueprint, Implementation Plan, Workflow-Fix-Summary
- `nexus-backend/prisma/schema.prisma` — data model source of truth
