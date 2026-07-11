# Technical Blueprint & Development Roadmap
## Business Service Management Platform — Version 1 (Backend)

**Status:** Pre-implementation blueprint. No application code included. This document is the single reference for building, testing, and committing each backend module in isolation, in dependency order, without breaking previously completed modules.

---

## 0. Stack Assumptions

These are assumed for the blueprint below and should be confirmed once, before Module 0 is built (not part of the frozen PRD, purely technical):

- **Runtime:** Node.js (TypeScript)
- **Framework:** Express
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** JWT (access token; refresh token architecture reserved, not implemented in V1 per PRD)
- **Validation:** Zod (or equivalent schema validator) at the controller boundary
- **File storage:** Abstracted storage interface (local disk in dev, S3-compatible in prod) — decided at Module 9 (Documents)
- **Testing:** Jest + Supertest for integration tests against a test database

If any of these differ from your actual setup, tell me before Module 0 starts and I'll adjust file paths/tooling references accordingly — everything else in this roadmap (module boundaries, responsibilities, order) stays valid regardless of stack.

---

## 1. Layered Dependency Map

Modules are grouped into **Layers**. A module may only depend on modules in the same or earlier layers. This ordering is what lets you build, test, and commit one module at a time without touching earlier ones.

```
Layer 0 — Foundation
  M0  Core Infrastructure

Layer 1 — Cross-Cutting Core Services
  M1  Auth & Users
  M2  Timeline & Audit Log
  M3  Notification Core
  M4  Status Engine

Layer 2 — Catalog
  M5  Service Catalog (Category + Service)

Layer 3 — Lead Management
  M6  Lead Module (Lead + Lead Service + Questionnaire Snapshot)

Layer 4 — Client
  M7  Client Module (Client Org + Conversion)

Layer 5 — Commercial Documents
  M8  Quotation Module
  M9  Project Module (Project + Project Service)
  M10 Invoice & Payment Module

Layer 6 — Supporting Modules
  M11 Documents Module
  M12 Messages Module

Layer 7 — Platform Services
  M13 Global Search
  M14 Dashboards & Reporting
```

Build strictly top to bottom. Each module's acceptance criteria must pass before starting the next.

---

## 2. Shared Conventions (apply to every module)

**Folder structure per module** (module name lowercase, e.g. `lead`):
```
src/modules/<module>/
  <module>.routes.ts
  <module>.controller.ts
  <module>.service.ts
  <module>.repository.ts
  <module>.validation.ts
  <module>.types.ts
src/modules/<module>/tests/
  <module>.service.test.ts
  <module>.integration.test.ts
```

**File responsibilities (identical pattern every module):**
- **`.routes.ts`** — Express route definitions only. Maps HTTP verb + path to controller method. Applies auth/permission middleware. No logic.
- **`.controller.ts`** — Parses request, calls `.validation.ts` schema, calls the service method, formats and returns the HTTP response. No business logic, no direct DB access.
- **`.service.ts`** — All business rules for the module. Calls repository methods. Orchestrates the mandatory action lifecycle (Validation → Authorization → Transaction → Timeline → Audit → Notification → Response) for every state-changing action. Never imports Prisma directly.
- **`.repository.ts`** — All Prisma queries for this module's tables, and only this module's tables. No business logic.
- **`.validation.ts`** — Request schema definitions (body/query/params) used by the controller.
- **`.types.ts`** — TypeScript interfaces/DTOs shared across the module's own files.

**Every module's acceptance criteria universally include:**
- All list endpoints support pagination, sorting, filtering, and search (per PRD §17.8).
- All endpoints reject unauthenticated/unauthorized requests correctly.
- All state-changing actions produce a Timeline entry and Audit Log entry.
- No soft-deleted record appears in default list/detail responses.
- 100% of validation rules are enforced server-side regardless of frontend behavior.
- Integration tests cover: happy path, validation failure, unauthorized access, not-found, and (where relevant) transaction-rollback-on-failure.

These are not repeated in full under every module below — assume they apply everywhere, in addition to the module-specific criteria listed.

---

## 3. Module Blueprints

---

### M0 — Core Infrastructure
**Layer:** 0 | **Depends on:** nothing

**Purpose:** Everything every other module needs to exist before it can be written: app bootstrap, DB connection, centralized error handling, logging, response formatting, pagination helper, and base security middleware.

**Database tables:** None (infrastructure only). Establishes Prisma connection and migration tooling.

**APIs:** `GET /health` (basic liveness check) only.

**Files to create:**
```
src/config/env.ts              — loads & validates environment variables
src/config/database.ts         — Prisma client singleton
src/core/errors/AppError.ts    — base error class + typed subclasses (NotFoundError, ValidationError, UnauthorizedError, ConflictError)
src/core/middleware/errorHandler.ts   — centralized error handler (single place, per PRD rule)
src/core/middleware/security.ts       — helmet, rate limiting, CORS
src/core/middleware/requestLogger.ts  — logs every request
src/core/utils/response.ts     — standard success/error response envelope
src/core/utils/pagination.ts   — shared pagination/sort/filter query parser
src/core/utils/transaction.ts  — wrapper for Prisma `$transaction`
src/app.ts                     — Express app assembly (mounts middleware, no routes yet)
src/server.ts                  — server bootstrap/listen
```

**Responsibilities:**
- `AppError` subclasses give every later module a consistent way to throw typed errors that `errorHandler.ts` converts into consistent HTTP responses — this is what makes "no try-catch duplication" (PRD §17.10) actually possible.
- `pagination.ts` is the single implementation every module's `.repository.ts` reuses — prevents 14 different pagination implementations.
- `transaction.ts` wraps Prisma's transaction API so every service method that needs atomic multi-table writes calls one shared helper, not raw `prisma.$transaction` scattered everywhere.

**Validation rules:** Environment variables validated at boot (fails fast if `DATABASE_URL`, `JWT_SECRET`, etc. are missing).

**Test cases:**
- App boots successfully with valid env vars.
- App fails to boot with missing required env vars.
- `/health` returns 200.
- Thrown `AppError` subclasses produce correct HTTP status + response shape.
- Unhandled exceptions are still caught and formatted, never leak a raw stack trace to the client.

**Acceptance criteria:**
- Server starts, connects to DB, responds to `/health`.
- Throwing any `AppError` subclass anywhere in the (future) app produces a consistent JSON error shape.
- No module built afterward needs to write its own error handler, pagination logic, or transaction wrapper.

---

### M1 — Auth & Users
**Layer:** 1 | **Depends on:** M0

**Purpose:** Authentication (JWT) and permission-based authorization, built so that new roles beyond Admin/Client can be added later without touching the auth mechanism itself (per PRD §3).

**Database tables:**
- `users` (id, email, phone, password_hash, role, is_active, created_at, updated_at, soft-delete fields)
- `permissions` (id, key, description) — seeded, not user-editable in V1
- `role_permissions` (role, permission_id) — join table, even though V1 only has 2 roles, this is what makes future roles addable without redesign

**APIs:**
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- (Admin-only, internal user management) `POST /api/users` (create Admin — likely seeded/manual in V1, but endpoint exists for future Staff roles)

**Files to create:**
```
src/modules/auth/auth.routes.ts
src/modules/auth/auth.controller.ts
src/modules/auth/auth.service.ts
src/modules/auth/auth.repository.ts
src/modules/auth/auth.validation.ts
src/modules/auth/auth.types.ts
src/core/middleware/authenticate.ts   — verifies JWT, attaches req.user
src/core/middleware/authorize.ts      — permission-check middleware, e.g. authorize('lead.create')
```

**Responsibilities:**
- `authenticate.ts` and `authorize.ts` live in `core/middleware` (not inside the auth module) because every other module's routes will import them — this is the seam that lets future roles/permissions be added without changing any other module's route files.
- Permission checks are **permission-key based** (`'lead.create'`, `'invoice.cancel'`) not role-based (`role === 'admin'`), so adding a new role later only means assigning existing permission keys to it — zero changes to route files.

**Validation rules:**
- Email format, password minimum strength on creation/change.
- Login rejects inactive/soft-deleted users.

**Test cases:**
- Valid login returns a valid JWT; invalid credentials return 401.
- Expired/tampered JWT is rejected by `authenticate.ts`.
- A user lacking a required permission is blocked by `authorize.ts` with 403.
- Password change requires correct current password.
- `/auth/me` returns the correct authenticated user profile.

**Acceptance criteria:**
- Any future route can be protected with `authenticate` + `authorize('some.permission')` with zero changes to this module.
- Adding a brand-new role in the future requires only a new row in `role_permissions` — confirmed by a test that assigns a hypothetical new role a subset of permissions and verifies enforcement, without any code change.

---

### M2 — Timeline & Audit Log
**Layer:** 1 | **Depends on:** M0, M1

**Purpose:** The two system-of-record logging mechanisms every other module writes into (PRD §13). Built early because every subsequent module's service layer will call into this one.

**Database tables:**
- `timeline_events` (id, entity_type, entity_id, event_type, description, actor_user_id, metadata JSON, created_at)
- `audit_logs` (id, entity_type, entity_id, action, actor_user_id, before_state JSON, after_state JSON, created_at)

**APIs:**
- `GET /api/timeline/:entityType/:entityId` — fetch timeline for a Lead/Project/etc.
- `GET /api/audit-logs/:entityType/:entityId` — Admin-only, technical log view

**Files to create:**
```
src/modules/timeline/timeline.routes.ts
src/modules/timeline/timeline.controller.ts
src/modules/timeline/timeline.service.ts        — exposes recordEvent() for other modules
src/modules/timeline/timeline.repository.ts
src/modules/timeline/timeline.validation.ts
src/modules/timeline/timeline.types.ts
src/modules/audit/audit.routes.ts
src/modules/audit/audit.controller.ts
src/modules/audit/audit.service.ts               — exposes recordAudit() for other modules
src/modules/audit/audit.repository.ts
src/modules/audit/audit.types.ts
```

**Responsibilities:**
- `timeline.service.ts`'s `recordEvent()` and `audit.service.ts`'s `recordAudit()` are the two functions every future module (Lead, Quotation, Invoice, Project, etc.) imports and calls as part of the mandatory action lifecycle (PRD §16). This is the only module every other business module has a hard dependency on besides Auth.
- Entity type + entity ID pattern (polymorphic association) is used instead of one FK per entity type, so Timeline/Audit never need schema changes when new entity types (Documents, Messages, future Vendor records) are introduced.

**Validation rules:**
- `entity_type` restricted to a known enum, extendable without migration pain (string field, validated against a maintained list in code, not a DB enum — this avoids a migration every time a new entity type is added).

**Test cases:**
- `recordEvent()` and `recordAudit()` correctly persist a record when called directly (unit test).
- `GET /timeline/:entityType/:entityId` returns events in chronological order.
- Audit log endpoint is blocked for non-Admin callers.
- A record with an unrecognized `entity_type` is rejected.

**Acceptance criteria:**
- Any future module can call `timelineService.recordEvent(...)` and `auditService.recordAudit(...)` with zero setup beyond importing the service.
- Timeline is provably human-readable (description field is a sentence, not raw JSON); Audit Log is provably technical (stores before/after state).

---

### M3 — Notification Core
**Layer:** 1 | **Depends on:** M0, M1

**Purpose:** Event-driven notification dispatch (PRD §14). Built as a generic event → channel system so Email works in V1 and WhatsApp/SMS/Push can be added later as new channel implementations only.

**Database tables:**
- `notification_events` (id, event_type, entity_type, entity_id, payload JSON, created_at)
- `notification_logs` (id, notification_event_id, channel, recipient, status, sent_at, error_message)

**APIs:** None public-facing in V1 (internal service only, consumed by other modules). Optionally: `GET /api/notifications/logs` (Admin-only, for debugging/support).

**Files to create:**
```
src/modules/notifications/notifications.service.ts     — exposes emitEvent()
src/modules/notifications/notifications.repository.ts
src/modules/notifications/notifications.types.ts
src/modules/notifications/channels/email.channel.ts    — implements a Channel interface
src/modules/notifications/channels/channel.interface.ts
src/modules/notifications/notifications.dispatcher.ts  — routes an event to the correct channel(s)
```

**Responsibilities:**
- `emitEvent()` is the single function every other module's service layer calls at the "Notification Event" step of the mandatory lifecycle. Modules never call an email library directly (PRD explicit rule: "Do not send emails directly from controllers").
- `channel.interface.ts` defines a contract (`send(recipient, payload)`) that `email.channel.ts` implements today; a future `whatsapp.channel.ts` implements the same contract with zero changes to any calling module.

**Validation rules:**
- Unknown `event_type` values are rejected/logged rather than silently dropped.
- Failed sends are recorded in `notification_logs` with an error, never thrown back to block the triggering business transaction (notification failure must never roll back a business action).

**Test cases:**
- `emitEvent()` persists a `notification_events` row and triggers the Email channel.
- Simulated channel failure is logged in `notification_logs` without throwing an exception up to the caller.
- Unknown event type is handled gracefully.

**Acceptance criteria:**
- Adding a second channel (WhatsApp, mocked) requires only a new file implementing `channel.interface.ts` and a dispatcher routing rule — confirmed with a test using a mock channel, no existing module code touched.

---

### M4 — Status Engine
**Layer:** 1 | **Depends on:** M0, M1, M2

**Purpose:** Centralized status transition validator (PRD §6.2, §17). No module may set a status field directly — every transition (Lead Service, Project Service, Quotation, Invoice states) goes through this engine, which validates the transition is legal and writes the Timeline entry.

**Database tables:**
- `status_transitions_log` (id, entity_type, entity_id, from_status, to_status, actor_user_id, reason, created_at) — optional but recommended for a full transition audit distinct from the general Timeline

**APIs:** None public — internal service consumed by Lead, Project, Quotation, Invoice modules.

**Files to create:**
```
src/modules/status-engine/statusEngine.service.ts   — exposes transition()
src/modules/status-engine/statusEngine.rules.ts      — defines legal transitions per entity type (the workflow graph from PRD §6.1)
src/modules/status-engine/statusEngine.repository.ts
src/modules/status-engine/statusEngine.types.ts
```

**Responsibilities:**
- `statusEngine.rules.ts` encodes the exact pipeline: `NEW → QUALIFIED → CONTACTED → SITE VISIT (optional) → QUOTE PREPARING → QUOTE SENT → NEGOTIATION → APPROVED → PROJECT CREATED → IN PROGRESS → ON HOLD → COMPLETED → CLOSED → ARCHIVED`, including which stages are skippable and under what condition (service config vs. Admin override).
- `transition()` is called by Lead Service and Project Service status changes; it validates the move is legal, persists it, and calls `timelineService.recordEvent()` — this is what guarantees Lead/Project aggregate status (derived, per PRD §4.4) can never be manually set out of band.

**Validation rules:**
- Illegal transitions (e.g., `NEW → COMPLETED` directly) are rejected with a typed error.
- Skipping "SITE VISIT" requires either the service's `requires_site_visit = No`, or an explicit Admin override reason (per PRD §6.3) — enforced here, not in the calling module.

**Test cases:**
- Legal transition succeeds and writes a Timeline entry.
- Illegal transition is rejected.
- Skipping Site Visit without a reason (when required/optional) is rejected; skipping with a reason succeeds and the reason is persisted.
- Concurrent/duplicate transition attempts don't produce inconsistent state (test with a transaction-level check).

**Acceptance criteria:**
- No later module (Lead, Project) contains any direct status-field write — confirmed by code review at integration time — every status change is provably routed through `statusEngine.transition()`.

---

### M5 — Service Catalog (Category + Service)
**Layer:** 2 | **Depends on:** M0, M1, M2

**Purpose:** Data-driven service catalog (PRD §5) — Admin can add/disable/edit services and categories without deployment.

**Database tables:**
- `categories` (id, name, parent_category_id nullable — self-referencing for hierarchy, is_active)
- `services` (id, category_id, name, description, icon, base_price nullable, requires_site_visit enum[yes/no/optional], is_active, created_at, updated_at)
- `service_questionnaires` (id, service_id, schema JSON, version, is_active) — developer-configured in V1, structured as JSON specifically so a future Questionnaire Builder can write to the same table

**APIs:**
- `GET /api/categories` (public, for wizard)
- `POST/PUT/DELETE /api/categories` (Admin)
- `GET /api/services` (public + Admin, paginated/filterable)
- `GET /api/services/:id`
- `POST/PUT /api/services` (Admin)
- `PATCH /api/services/:id/disable`
- `GET /api/services/:id/questionnaire`

**Files to create:**
```
src/modules/catalog/category.routes.ts
src/modules/catalog/category.controller.ts
src/modules/catalog/category.service.ts
src/modules/catalog/category.repository.ts
src/modules/catalog/category.validation.ts
src/modules/catalog/service.routes.ts
src/modules/catalog/service.controller.ts
src/modules/catalog/service.service.ts
src/modules/catalog/service.repository.ts
src/modules/catalog/service.validation.ts
src/modules/catalog/catalog.types.ts
```

**Responsibilities:**
- `category.repository.ts` implements parent-child querying (recursive/self-join) so category hierarchy (PRD §5, Solar → Residential/Commercial/Industrial) works even in V1's likely-flat data.
- `service_questionnaires` is versioned from day one (`version` + `is_active`) so historical Lead Service submissions always reference the exact questionnaire version they were answered against, even after a developer updates the schema later.

**Validation rules:**
- Service cannot be deleted (soft-delete/disable only) if referenced by any existing Lead/Project — enforced at service layer before disabling, though disabling ≠ deleting so this is a soft guard, not a hard block.
- `requires_site_visit` restricted to the three defined enum values.

**Test cases:**
- Create/edit/disable a service without redeploying (i.e., purely via API + DB).
- Fetch category tree returns correct parent-child nesting.
- Disabling a service removes it from the public wizard's service list but keeps it visible in Admin's historical records.
- Questionnaire fetch returns the correct active version for a service.

**Acceptance criteria:**
- A brand-new service (7th, 8th...) can be added, categorized, and made available in the public wizard entirely through the API — confirmed by an integration test that adds a new service and verifies it appears in `GET /services`.

---

### M6 — Lead Module (Lead + Lead Service + Questionnaire Snapshot)
**Layer:** 3 | **Depends on:** M0, M1, M2, M4, M5

**Purpose:** Public multi-service enquiry intake and internal lead management (PRD §4.2, §6).

**Database tables:**
- `leads` (id, lead_number [unique, human-readable], contact_name, phone, email, company_name nullable, source, created_at, soft-delete fields)
- `lead_services` (id, lead_id, service_id, status, questionnaire_version_id, questionnaire_answers JSON, site_visit_required_override nullable, site_visit_override_reason nullable, created_at)
- `lead_activity_notes` (id, lead_id, author_user_id, note, created_at) — human call-log/follow-up notes, distinct from Timeline (per earlier discovery discussion; confirm inclusion — flagged as a sensible default already implied by "Calling Customers" in PRD §3)

**APIs:**
- `POST /api/leads` (public — the enquiry wizard submission; creates Lead + N Lead Services in one transaction)
- `GET /api/leads` (Admin, paginated/filterable/searchable)
- `GET /api/leads/:id`
- `PATCH /api/leads/:id` (contact info edits)
- `POST /api/leads/:id/services` (Admin — add a service to an existing Lead, pre-conversion)
- `PATCH /api/leads/:id/services/:leadServiceId/status` (routes through Status Engine)
- `POST /api/leads/:id/notes` (activity/call log)
- `GET /api/leads/:id/notes`

**Files to create:**
```
src/modules/lead/lead.routes.ts
src/modules/lead/lead.controller.ts
src/modules/lead/lead.service.ts
src/modules/lead/lead.repository.ts
src/modules/lead/lead.validation.ts
src/modules/lead/lead.types.ts
src/modules/lead/leadService.repository.ts   — separate repository for lead_services sub-entity
src/modules/lead/leadActivityNote.repository.ts
```

**Responsibilities:**
- `lead.service.ts`'s create-lead flow wraps Lead + all requested Lead Services in a single DB transaction (M0's `transaction.ts`) — either the whole multi-service enquiry is recorded, or none of it is.
- Each `lead_services` row captures which questionnaire version was active at submission time (`questionnaire_version_id`), guaranteeing historical answers remain interpretable even after the service's questionnaire schema changes later.
- Status changes on a Lead Service call `statusEngine.transition()` (M4) — never write `status` directly.

**Validation rules:**
- At least one service must be selected per enquiry.
- Questionnaire answers validated against the referenced questionnaire's JSON schema at submission time.
- Phone/email format validation; duplicate-phone detection is flagged (from earlier discovery) as a nice-to-have, not blocking — default to warn-not-block in V1 unless you say otherwise when this module is built.

**Test cases:**
- Multi-service enquiry creates one Lead with correct number of Lead Services, atomically.
- A failed questionnaire validation on one service rejects the entire submission (transaction rollback).
- Adding a service to an existing (unconverted) Lead succeeds and appears under the same Lead.
- Lead Service status transition through an illegal path is rejected (delegated to M4's tests, re-verified here at integration level).
- List/search/filter/pagination all function against `GET /leads`.

**Acceptance criteria:**
- A public multi-service submission with 3 services produces exactly 1 Lead + 3 Lead Services, each independently visible with its own status, per PRD §4.2 and §4.4.

---

### M7 — Client Module (Client Org + Conversion)
**Layer:** 4 | **Depends on:** M0, M1, M2, M6

**Purpose:** Client (business/organization) accounts, and the Admin-triggered Lead→Client conversion flow (PRD §3, §10).

**Database tables:**
- `clients` (id, company_name nullable, contact_name, phone, email [unique], password_hash, source_lead_id, is_active, created_at, soft-delete fields)
- (Schema note, not a V1 table: reserve conceptual room for a future `client_contacts` table for multi-user client companies — no table built in V1, but `clients.company_name` being separate from `contact_name`/`email` already keeps the door open per PRD §3.)

**APIs:**
- `POST /api/leads/:id/convert-to-client` (Admin-only — "Create Client Account" action)
- `POST /api/auth/client-login` (or reuse M1's login with role differentiation — decide at build time based on final auth design)
- `GET /api/clients` (Admin, paginated/searchable)
- `GET /api/clients/:id`
- `GET /api/clients/me` (Client-facing — own profile)
- `PATCH /api/clients/:id` (Admin edits)

**Files to create:**
```
src/modules/client/client.routes.ts
src/modules/client/client.controller.ts
src/modules/client/client.service.ts
src/modules/client/client.repository.ts
src/modules/client/client.validation.ts
src/modules/client/client.types.ts
```

**Responsibilities:**
- `client.service.ts`'s `convertLeadToClient()` is the exact implementation of PRD §10: generates login credentials, hashes a temp/initial password, triggers `notificationsService.emitEvent('client.account.created', ...)` (M3) to send credentials by email, and links the Lead's future Project(s) to this Client — all inside one transaction.
- Conversion is idempotent-guarded: a Lead that's already converted cannot be converted again (returns a typed conflict error, not a duplicate Client).

**Validation rules:**
- Conversion requires the Lead to have at least one Lead Service in `APPROVED` status or later (enforced here, business rule from PRD §10: "normally occurs when the quotation is accepted").
- Email uniqueness enforced across `clients`.

**Test cases:**
- Converting an eligible Lead creates exactly one Client, sends a notification event, and the Lead is marked converted.
- Attempting to convert an already-converted Lead is rejected.
- Attempting to convert a Lead with no approved services is rejected (or allowed with an explicit Admin override flag — confirm exact rule at build time; default is rejection).
- Client login succeeds with correct credentials, fails otherwise.

**Acceptance criteria:**
- The full conversion flow (Lead → Client, credentials emailed, future Projects linkable) works end-to-end in one atomic operation, matching PRD §10 exactly.

---

### M8 — Quotation Module
**Layer:** 5 | **Depends on:** M0, M1, M2, M5, M6, M7

**Purpose:** Multi-service, versioned quotations (PRD §7).

**Database tables:**
- `quotations` (id, quotation_number, lead_id, client_id nullable, status [Draft/Sent/Negotiation/Approved/Rejected], active_version_id, created_at)
- `quotation_versions` (id, quotation_id, version_number, is_active, subtotal, discount, gst_amount, transportation, installation, grand_total, created_by_user_id, created_at)
- `quotation_items` (id, quotation_version_id, service_id, description, quantity, unit_price, tax_rate, tax_amount, line_total)
- `quotation_approvals` (id, quotation_version_id, approved_by_user_id, approval_method enum[phone/whatsapp/email/in_person], approved_at)

**APIs:**
- `POST /api/quotations` (Admin — create, tied to a Lead, with initial version + items)
- `POST /api/quotations/:id/revise` (Admin — creates a new version, deactivates the previous)
- `GET /api/quotations/:id` (returns active version + full version history)
- `GET /api/quotations` (Admin, paginated/searchable)
- `POST /api/quotations/:id/approve` (Admin records approval + method, per PRD §5's approval rule)
- `GET /api/clients/:id/quotations` (Client-facing, own quotations only)

**Files to create:**
```
src/modules/quotation/quotation.routes.ts
src/modules/quotation/quotation.controller.ts
src/modules/quotation/quotation.service.ts
src/modules/quotation/quotation.repository.ts
src/modules/quotation/quotationVersion.repository.ts
src/modules/quotation/quotationItem.repository.ts
src/modules/quotation/quotation.validation.ts
src/modules/quotation/quotation.types.ts
```

**Responsibilities:**
- `quotation.service.ts`'s `reviseQuotation()` never mutates an existing `quotation_versions` row — it always inserts a new version and flips `is_active` atomically (old version's `is_active = false`, new version's `is_active = true`), guaranteeing full immutable history per PRD §7.
- `quotation_items` supports unlimited line items across multiple services in one quotation version, matching PRD §7's Interior + Electrical + Solar example.
- Approval recording (`quotation_approvals`) captures `approval_method` as a required field — this is the PRD §5 audit requirement, not optional metadata.

**Validation rules:**
- At least one line item required per version.
- Grand total is server-calculated from line items + discount + GST + transportation + installation — never trusted from client input.
- A quotation cannot be approved if it has no active version, or if it's already approved.

**Test cases:**
- Creating a quotation with 3 service line items computes the correct grand total server-side.
- Revising a quotation creates version 2, deactivates version 1, and version 1 remains fully readable.
- Approving a quotation without an `approval_method` is rejected.
- Client-facing endpoint only returns quotations belonging to that client.

**Acceptance criteria:**
- A quotation can be revised 3+ times and every prior version remains intact and queryable — verified by a test walking through 3 revisions and asserting all versions are still readable with correct `is_active` flags.

---

### M9 — Project Module (Project + Project Service)
**Layer:** 5 | **Depends on:** M0, M1, M2, M4, M6, M7, M8

**Purpose:** Converts an approved Lead/Quotation into an active Project, with independently tracked Project Services (PRD §4.3, §4.4, §9).

**Database tables:**
- `projects` (id, project_number, lead_id, client_id, created_at, soft-delete fields — note: no `status` column, per PRD §4.4, status is always derived)
- `project_services` (id, project_id, service_id, lead_service_id nullable, status, assigned_quotation_version_id, created_at)

**APIs:**
- `POST /api/projects` (Admin — create from an approved Lead; wraps Lead Services → Project Services)
- `POST /api/projects/:id/services` (Admin — add a new service to an existing, active Project, per PRD §4.3)
- `PATCH /api/projects/:id/services/:projectServiceId/status` (routes through Status Engine)
- `GET /api/projects/:id` (returns Project + all Project Services + **derived aggregate status**)
- `GET /api/projects` (Admin, paginated/searchable)
- `GET /api/clients/:id/projects` (Client-facing)
- `POST /api/projects/:id/complete` (Admin-only — but only permitted when all Project Services are individually COMPLETED)

**Files to create:**
```
src/modules/project/project.routes.ts
src/modules/project/project.controller.ts
src/modules/project/project.service.ts
src/modules/project/project.repository.ts
src/modules/project/projectService.repository.ts
src/modules/project/project.validation.ts
src/modules/project/project.types.ts
src/modules/project/project.aggregateStatus.ts   — pure function computing derived status from Project Services
```

**Responsibilities:**
- `project.aggregateStatus.ts` is the single, isolated implementation of PRD §4.4's derived-status rule (e.g., "Active — 2 Services Running," "Completed"). It is a pure function (Project Services in → aggregate label out), never a stored/cached value, callable from both the API response layer and the Dashboard module (M14) later.
- `addServiceToProject()` in `project.service.ts` is the exact implementation of PRD §4.3 — adding Solar to an Interior-only Project without creating a new Lead or Client, and is the trigger point for optionally creating a new Quotation/Invoice under the same Project.
- Project completion (`POST /projects/:id/complete`) is blocked at the service layer unless every Project Service is already `COMPLETED` — this enforces PRD §9's rule using data, not developer discipline.

**Validation rules:**
- A Project cannot be created from a Lead with zero approved Lead Services.
- Adding a service to a Project requires that service to be active in the Catalog (M5).
- Project-level `status` field does not exist in the schema — enforced by design, not just convention, so no future developer can accidentally write to it.

**Test cases:**
- Creating a Project from a Lead with 2 approved services produces 2 Project Services, each starting at the correct initial status.
- Aggregate status correctly reflects mixed Project Service statuses (e.g., 1 IN PROGRESS + 1 NEW → "Active, 2 Services Running").
- Adding a new service mid-project succeeds and doesn't disturb existing Project Services' statuses.
- `POST /projects/:id/complete` is rejected while any Project Service is not COMPLETED, and succeeds once all are.

**Acceptance criteria:**
- The exact scenario from PRD §4.4 (Interior → IN PROGRESS, Solar → QUOTE SENT, CCTV → NEW, all under one Project) is reproducible and the aggregate status computation is verifiably correct for that state — this is the module's core proof of correctness.

---

### M10 — Invoice & Payment Module
**Layer:** 5 | **Depends on:** M0, M1, M2, M7, M9

**Purpose:** Freeform, GST-compliant, immutable invoicing with manual partial payments (PRD §8).

**Database tables:**
- `invoices` (id, invoice_number [sequential per financial year, immutable], project_id, client_id, label, status [Issued/Cancelled], subtotal, gst_amount, grand_total, issued_at, created_by_user_id) — **no update/delete on core financial fields once issued; only `status` may move to Cancelled**
- `invoice_items` (id, invoice_id, description, quantity, unit_price, hsn_sac_code, tax_rate, tax_amount, line_total)
- `payments` (id, invoice_id, amount, method, reference_note, recorded_by_user_id, paid_at)
- `invoice_number_sequences` (id, financial_year, last_number) — dedicated counter table to guarantee gapless, per-financial-year sequential numbering under concurrent requests

**APIs:**
- `POST /api/invoices` (Admin — freeform, tied to a Project)
- `GET /api/invoices/:id`
- `GET /api/invoices` (Admin, paginated/searchable)
- `PATCH /api/invoices/:id/cancel` (Admin-only — marks Cancelled, number preserved, per PRD §8.3's rule; requires reason)
- `POST /api/invoices/:id/payments` (Admin — record a manual partial/full payment)
- `GET /api/invoices/:id/payments`
- `GET /api/projects/:id/financial-summary` (Project Total / Total Invoiced / Total Paid / Outstanding — PRD §8.1)
- `GET /api/clients/:id/invoices` (Client-facing)

**Files to create:**
```
src/modules/invoice/invoice.routes.ts
src/modules/invoice/invoice.controller.ts
src/modules/invoice/invoice.service.ts
src/modules/invoice/invoice.repository.ts
src/modules/invoice/invoiceNumbering.service.ts   — isolated, transaction-safe sequence generator
src/modules/invoice/payment.repository.ts
src/modules/invoice/payment.service.ts
src/modules/invoice/invoice.validation.ts
src/modules/invoice/invoice.types.ts
src/modules/invoice/financialSummary.service.ts   — computes Project Total / Invoiced / Paid / Outstanding
```

**Responsibilities:**
- `invoiceNumbering.service.ts` is deliberately isolated and uses a row-level lock (`SELECT ... FOR UPDATE` inside a transaction, via M0's `transaction.ts`) on `invoice_number_sequences` to guarantee **no gaps and no collisions** even under concurrent invoice creation — this is the single most legally sensitive piece of the entire backend (PRD §8.3) and must never share logic with any other counter in the system.
- Invoices are **never updated or deleted** after issue — `invoice.service.ts`'s cancel operation only ever flips `status` to `Cancelled`, and this is enforced at the service layer, not left to developer discipline at the controller.
- The Invoice schema deliberately has no `credit_note_id` or credit-note logic in V1, but `status` is an extendable enum specifically so a future `Credit Note` entity can reference an invoice via a new, additive table without altering `invoices` itself (PRD §8.3's explicit forward-compatibility requirement).
- `financialSummary.service.ts` computes Total Invoiced / Total Paid / Outstanding live from `invoices` + `payments`, never as a stored/cached field, to prevent drift.

**Validation rules:**
- Invoice line items require valid HSN/SAC code and tax rate; different line items may carry different tax rates on the same invoice (PRD §8.3).
- Payment amount cannot cause total payments on an invoice to exceed the invoice's grand total (reject or flag overpayment — default: reject with a clear error unless you specify otherwise at build time).
- Cancel action requires a mandatory reason, logged to Timeline.

**Test cases:**
- Two invoices created concurrently receive distinct, sequential numbers with no gap (concurrency test).
- Cancelling an invoice preserves its number and marks it Cancelled; it never disappears from `GET /invoices`.
- Line items with two different tax rates on one invoice compute the correct total GST.
- Recording a partial payment correctly updates the Project's financial summary (Total Paid, Outstanding).
- Attempting to directly mutate a core financial field on an issued invoice is impossible via any exposed endpoint (i.e., there is no `PATCH /invoices/:id` that touches financial fields — confirmed by route inventory, not just a test).

**Acceptance criteria:**
- Numbering is provably gapless and sequential under concurrent load (load-tested with parallel invoice creation requests).
- The full PRD §8.2 example (₹100,000 invoice, ₹30,000 paid, ₹70,000 outstanding) is reproducible via the API and reflected correctly in the financial summary endpoint.

---

### M11 — Documents Module
**Layer:** 6 | **Depends on:** M0, M1, M2, M6, M7, M9

**Purpose:** File attachment to both Lead and Project (PRD §11), Admin-upload-only in V1.

**Database tables:**
- `documents` (id, entity_type [Lead/Project], entity_id, document_type [Drawing/Image/RequirementPDF/Contract/Quotation/SitePhoto/CompletionReport/Warranty/Other], file_name, file_url, file_size, mime_type, uploaded_by_user_id, created_at, soft-delete fields)

**APIs:**
- `POST /api/documents` (Admin — upload, tied to `entity_type` + `entity_id`)
- `GET /api/documents?entityType=&entityId=`
- `GET /api/documents/:id/download`
- `DELETE /api/documents/:id` (soft delete only)
- `GET /api/clients/:id/documents` (Client-facing, read-only)

**Files to create:**
```
src/modules/documents/documents.routes.ts
src/modules/documents/documents.controller.ts
src/modules/documents/documents.service.ts
src/modules/documents/documents.repository.ts
src/modules/documents/documents.validation.ts
src/modules/documents/documents.types.ts
src/core/storage/storage.interface.ts     — Channel-style abstraction, same pattern as M3's notification channels
src/core/storage/localStorage.provider.ts  — dev implementation
src/core/storage/s3Storage.provider.ts     — prod implementation (or stubbed until infra decided)
```

**Responsibilities:**
- `storage.interface.ts` follows the exact same abstraction pattern established in M3 (`channel.interface.ts`) — this consistency is intentional so the codebase has one recognizable pattern for "pluggable provider," reused for notifications, storage, and (later) payment gateways.
- Documents use the same polymorphic `entity_type` + `entity_id` pattern as Timeline/Audit (M2), so attaching Documents to a future entity type (e.g., Vendor records) requires no schema change.
- Upload permission check (Admin-only in V1) lives in the service layer as an explicit, isolated check — deliberately easy to relax later ("Clients may upload" is a future PRD item) without restructuring anything else.

**Validation rules:**
- File type/size limits enforced server-side (not just relying on frontend).
- `entity_type` + `entity_id` must reference an existing, non-deleted Lead or Project.

**Test cases:**
- Upload succeeds and is retrievable under the correct Lead/Project.
- Upload with a disallowed file type/oversized file is rejected.
- Client attempting to upload is rejected with 403 (proves the V1 restriction is enforced, not just a frontend hint).
- Client can list/download documents for their own Project only, not others'.
- Soft-deleting a document removes it from default listings but the row remains in DB.

**Acceptance criteria:**
- A document is provably retrievable months later regardless of which storage provider is active, because all module code only ever talks to `storage.interface.ts`, never a specific provider directly.

---

### M12 — Messages Module
**Layer:** 6 | **Depends on:** M0, M1, M2, M7

**Purpose:** Real two-way chat between Admin and Client (PRD §12), explicitly distinct from Notifications.

**Database tables:**
- `conversations` (id, client_id, project_id nullable, created_at) — one conversation thread per Client (or optionally per Project — confirm exact grouping at build time; default: one thread per Client, since PRD doesn't specify per-project threads)
- `messages` (id, conversation_id, sender_type [Admin/Client], sender_user_id, body, is_read, created_at)

**APIs:**
- `POST /api/conversations/:clientId/messages` (send — usable by both Admin and Client, sender determined by authenticated identity)
- `GET /api/conversations/:clientId/messages` (paginated, chronological)
- `PATCH /api/conversations/:clientId/messages/read` (mark as read)
- `GET /api/conversations` (Admin — list all client conversations, unread counts)

**Files to create:**
```
src/modules/messages/conversation.routes.ts
src/modules/messages/conversation.controller.ts
src/modules/messages/conversation.service.ts
src/modules/messages/conversation.repository.ts
src/modules/messages/message.repository.ts
src/modules/messages/messages.validation.ts
src/modules/messages/messages.types.ts
```

**Responsibilities:**
- Deliberately kept as its own module, entirely separate from M3 (Notification Core), even though both eventually "notify" someone — Messages is a queryable, persistent, two-way conversation entity; Notifications is a fire-and-forget event log. Conflating them was explicitly ruled out in the PRD (§12) and this separation is preserved in the schema, not just the API surface.
- `is_read` is tracked per message, per PRD's "Read Status" requirement, not just per conversation, so unread counts are always accurate even with interleaved sender turns.

**Validation rules:**
- Only the Client who owns a conversation, or an Admin, may read/send within it — enforced at the service layer against `req.user`.
- Empty message body rejected.

**Test cases:**
- Admin and Client can both send into the same conversation and see each other's messages in order.
- A Client cannot access another Client's conversation.
- Marking messages read correctly updates `is_read` and unread counts.
- Message list is properly paginated for long conversation histories.

**Acceptance criteria:**
- A full back-and-forth conversation (Admin → Client → Admin) is stored, orderable, and correctly attributed by sender — verified with a multi-turn integration test.

---

### M13 — Global Search
**Layer:** 7 | **Depends on:** M0, M1, M5, M6, M7, M8, M9, M10

**Purpose:** Simple indexed search across core entities (PRD §15).

**Database tables:** None new — relies on appropriate indexes added to existing tables (`leads.lead_number`, `clients.company_name`/`email`/`phone`, `projects.project_number`, `quotations.quotation_number`, `invoices.invoice_number`, `services.name`). This module is primarily a query-composition layer, not a new data owner.

**APIs:**
- `GET /api/search?q=...` — Admin-only, returns grouped results by entity type

**Files to create:**
```
src/modules/search/search.routes.ts
src/modules/search/search.controller.ts
src/modules/search/search.service.ts       — fans a query out to each module's repository search method
src/modules/search/search.types.ts
```

**Responsibilities:**
- `search.service.ts` deliberately does **not** contain its own database queries — it calls existing `.repository.ts` search methods already built into M6/M7/M8/M9/M10 (each of those repositories already supports filtered listing per the shared convention in §2). This avoids a second, divergent query implementation for the same tables. If this pattern turns out to be too slow at scale, a dedicated search index (e.g., Postgres full-text or Elasticsearch) is a drop-in replacement behind the same `search.service.ts` interface — confirmed as a deliberate seam.

**Validation rules:**
- Query string minimum length (e.g., 2 characters) to avoid pathologically broad scans.

**Test cases:**
- Searching a known Lead Number, Client phone, Invoice Number, and Service Name each return the correct entity in the correct group.
- Empty/too-short query returns a validation error, not an empty broad scan.
- Search results respect the requester's authorization (Admin-only in V1, no Client-facing search per PRD §15's scope).

**Acceptance criteria:**
- A single search term matching multiple entity types (e.g., a phone number appearing in both a Lead and a Client) correctly returns both, grouped by entity type.

---

### M14 — Dashboards & Reporting
**Layer:** 7 | **Depends on:** all prior modules

**Purpose:** Admin and Client dashboard data endpoints (PRD §1, §18). Note: exact widget list was flagged as an open item in the PRD (§19) — this module's specific metrics should be confirmed with you before implementation begins, but the module boundary and its dependency position are fixed regardless of which exact metrics are chosen.

**Database tables:** None new — read-only aggregation queries against existing tables. If performance requires it later, this is the one place pre-aggregated summary tables could be introduced without affecting any other module.

**APIs (indicative — to be finalized against confirmed metrics):**
- `GET /api/dashboard/admin/summary` (lead counts by status, revenue totals, overdue invoices, etc.)
- `GET /api/dashboard/client/summary` (own project status overview)

**Files to create:**
```
src/modules/dashboard/dashboard.routes.ts
src/modules/dashboard/dashboard.controller.ts
src/modules/dashboard/adminDashboard.service.ts
src/modules/dashboard/clientDashboard.service.ts
src/modules/dashboard/dashboard.repository.ts
src/modules/dashboard/dashboard.types.ts
```

**Responsibilities:**
- Built last, deliberately, because it is a pure read/aggregation layer over every other module's data — building it earlier would either duplicate query logic prematurely or lock in metrics before the underlying modules (and your confirmed metric list) exist.

**Validation rules:** N/A (read-only, date-range query params validated for format only).

**Test cases:**
- Admin summary reflects correct counts against known seeded data.
- Client summary only reflects that client's own data, never another client's.

**Acceptance criteria:**
- Deferred in detail until the specific metric list is confirmed (per PRD §19) — module boundary and position in the build order are final regardless.

---

## 4. Suggested Git Workflow Per Module

For each module `M<n>`:
1. Create branch `feature/m<n>-<module-name>`.
2. Implement files per the module's file list above.
3. Write and pass all listed test cases locally (`npm test -- <module-name>`).
4. Confirm the module's acceptance criteria explicitly, one by one.
5. Merge to main / commit with message pattern: `feat(m<n>-<module-name>): <summary>`.
6. Only then request the next module.

This guarantees each module is independently verifiable and that a regression, if one ever appears, can be bisected to a single module's commit.

---

## 5. How to Use This Document Going Forward

To build a module, say: **"Build M<n> — \<module name>"**. I will implement exactly the files listed for that module, following its responsibilities, validation rules, and file conventions from §2, and stop at that module's boundary — no other module's files will be touched. I will not re-ask business questions already answered in the PRD, and I will not expand a module's scope beyond what's specified here unless you ask.
