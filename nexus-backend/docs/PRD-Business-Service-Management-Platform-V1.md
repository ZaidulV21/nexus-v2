# Product Requirements Document (PRD)
## Business Service Management Platform — Version 1

**Document status:** Final for Phase 2 (Product Requirements). Supersedes all prior discovery notes. Architecture decisions referenced here are locked and should only be revisited if a genuine conflict surfaces during Phase 4 (Software Architecture) or Phase 5 (Database Design).

---

## 1. Executive Summary

The platform is a **single-business, multi-service operations system** that manages the full customer lifecycle — from public enquiry to completed, paid, documented project — for one company offering multiple service lines (e.g., Interior Design, Solar, CCTV, Electrical, Branding, Website & IT).

It is **not** a CRM, and **not** multi-tenant SaaS. It is a purpose-built operations backbone for one business, engineered with clean modular architecture so that new services, roles, and channels can be added later without schema or backend rewrites.

**Core principle:** the backend is the single source of truth. All business rules, validation, and status transitions are enforced server-side. The frontend (built separately, to a pre-existing design) only displays data, collects input, and calls APIs.

---

## 2. Goals & Non-Goals

### 2.1 Goals for V1
- Let a customer request one or many services in a single enquiry, each with a service-specific questionnaire.
- Give the business (Admin) a single system to manage leads, quotations, invoices, projects, documents, and client communication.
- Track each requested service's progress **independently**, even within one Lead/Project.
- Produce GST-compliant, legally immutable invoices with manual partial-payment tracking.
- Give clients a dashboard to see their project status, documents, quotations, invoices, and message the business.
- Build every module so that V2/V3 features (roles, vendor management, automation, payment gateway, questionnaire builder, mobile apps) slot in without a backend rewrite.

### 2.2 Explicit Non-Goals for V1
- No multi-tenancy, no organization/business-configuration layer above the single business.
- No Vendor Portal, no Sales Team module, no internal roles beyond Admin.
- No payment gateway integration (manual payment recording only).
- No automation engine / workflow rules editor.
- No dynamic questionnaire builder (questionnaires are developer-configured).
- No WhatsApp/SMS/push notifications (email only).
- No client-side digital quote acceptance or project sign-off (Admin-recorded only).
- No document content search / OCR.
- No credit notes (architecture must allow them later without model changes).

---

## 3. Users & Roles

| Role | Description | V1 Scope |
|---|---|---|
| **Admin** | Runs all internal operations: lead management, calls, site visits, quotations, invoices, project management, document uploads, service catalog management | Full access, single role |
| **Client** | A business or individual customer who has been converted from a Lead. Can view their own projects, quotations, invoices, documents, and send/receive messages | Read access to own data; can send messages |

**Design constraints carried into architecture:**
- Authentication/authorization must be **permission-based under the hood**, even though only two roles exist today, so that future roles (Staff, Sales, Vendor) can be introduced without redesigning the auth system.
- A single internal user must be able to hold multiple roles in the future — the schema should support a user↔role relationship, not a single enum field, even though V1 only ever assigns "Admin."
- **Clients are modeled as Businesses/Organizations**, not just individuals. V1 issues exactly one login per client company. The data model must anticipate multiple contact-person logins per client company in a future version without restructuring the Client entity.

---

## 4. Core Business Model

### 4.1 Single Business, Multiple Services
One business. One deployment. Multiple services sold from one catalog, one workflow engine, one set of leads/clients/projects.

### 4.2 Lead → Lead Services
A customer enquiry, regardless of how many services it includes, creates **exactly one Lead**. Each requested service becomes a **Lead Service** record under that Lead.

```
Lead #L-0001 (John Doe, ABC Pvt Ltd)
 ├── Lead Service: Interior Design
 ├── Lead Service: Solar Installation
 └── Lead Service: CCTV
```

This keeps all customer communication and history centralized under one Lead, while allowing each requested service to be tracked, quoted, and progressed on its own timeline.

### 4.3 Project → Project Services
When a Lead converts, it becomes a **Project**, and each Lead Service becomes a **Project Service**. A customer may add a new service to an existing, in-progress Project at any time (e.g., adding Solar to a Project that started as Interior-only). This does **not** create a new customer or a new Lead — it adds a new Project Service under the existing Project, and may generate its own new Quotation and Invoice(s) as needed.

### 4.4 Independent Per-Service Status (critical architectural rule)
**Status is never stored as a single value on the Lead or the Project.** Each Lead Service and each Project Service carries its own workflow status and progresses independently.

```
Project #P-0042
 ├── Interior     → IN PROGRESS
 ├── Solar        → QUOTE SENT
 └── CCTV         → NEW
```

Lead-level and Project-level status shown on dashboards (e.g., "Active — 2 Services Running," "Completed") are **derived/aggregate values, calculated on read** from the underlying service statuses — never manually set, never stored as an independent source of truth. This guarantees the aggregate can never drift out of sync with reality.

---

## 5. Service Catalog

- The Service Catalog is **fully data-driven**. Admin can add, disable, edit description/icon/base pricing/category for any service **without a code deployment**.
- Every service belongs to a **Category**, and categories support **parent-child hierarchy** (e.g., Energy → Solar → Residential/Commercial/Industrial) even though V1 may only use flat categories initially.
- Each service has a **`requires_site_visit`** configuration with three states: **Yes / No / Optional** (Admin discretion at lead time for "Optional," and Admin can always manually skip or add a site visit regardless of the default — every manual override must be recorded in the Timeline with a reason).
- **Dynamic questionnaires exist per service but are developer-configured in V1** — not admin-editable. A Questionnaire Builder is explicitly a V2 feature; the architecture must not block adding it later (i.e., questionnaire structure should already be stored as structured/JSON data tied to a service, just not editable via UI yet).

---

## 6. Workflow Engine

### 6.1 Universal Pipeline
All services share **one universal workflow** — there are no service-specific pipelines. Certain stages are optional and may be skipped depending on service configuration or Admin discretion:

```
NEW → QUALIFIED → CONTACTED → SITE VISIT (optional) → QUOTE PREPARING
   → QUOTE SENT → NEGOTIATION → APPROVED → PROJECT CREATED
   → IN PROGRESS → ON HOLD → COMPLETED → CLOSED → ARCHIVED
```

This pipeline applies **per Lead Service / per Project Service**, not per Lead/Project as a whole (see §4.4).

### 6.2 Status Engine
All status transitions must pass through a **centralized Status Engine**. No module or controller may write a status value directly. This guarantees every transition is validated, logged to the Timeline, and (where relevant) triggers a Notification Event — consistently, regardless of which module initiated the change.

### 6.3 Site Visit Handling
- Configured per service as Yes / No / Optional.
- Admin retains override authority in all cases (add or skip), and every override is logged to the Timeline with a mandatory reason field.

---

## 7. Quotations

- One Quotation may include **multiple services and unlimited line items** (e.g., Interior + Electrical + Solar in a single document), plus GST, Discount, Transportation, and Installation as additional line items, culminating in a Grand Total.
- **Full version history is mandatory.** Every revision creates a new immutable version; only one version is ever "Active" at a time. Old versions remain permanently viewable — nothing is overwritten or lost.
- **Approval is Admin-recorded, not client-digital, in V1.** The Admin marks a quotation Approved after receiving confirmation through phone, WhatsApp, email, or in person, and must record the approval **source/method**. The Timeline stores date, time, user, and approval method for every approval. Digital client-side acceptance from the Client Dashboard is an explicit V2 feature the architecture must accommodate later without a model change.

---

## 8. Invoicing & Payments

### 8.1 Freeform Invoice Model
V1 uses a **freeform invoicing model** — the Admin may create any number of invoices against a Project, in any amount, with any label (Advance, Material Payment, Installation Payment, Final Payment, AMC, Retention Payment, etc.). There is no fixed 2-invoice or 3-invoice restriction.

The system automatically calculates, at the Project level:
- Project Total
- Total Invoiced
- Total Paid
- Outstanding Balance

**Payment Plans / automatic milestone generation are explicitly deferred to V2.**

### 8.2 Partial Payments
Manual partial payment recording is required in V1 (e.g., an Admin logs a ₹30,000 payment against a ₹100,000 invoice, leaving ₹70,000 outstanding). No payment gateway integration in V1 — all payments are recorded by the Admin after being received through offline channels (bank transfer, cheque, cash, UPI, etc.), with method/reference noted.

### 8.3 GST Compliance
Invoices are treated as **legal financial records** with the following non-negotiable rules:
- Support for GSTIN, HSN/SAC codes, tax percentage, and tax amount per line item.
- **Different line items may carry different tax rates** on the same invoice — the architecture must support this even though all current services may use one rate today.
- **Invoice numbers are sequential per financial year and are permanently immutable once issued** — they can never be changed, reused, or renumbered.
- **Invoices can never be deleted.** If an issued invoice becomes invalid, it is marked **Cancelled** — the original number and full audit trail are preserved permanently.
- **Credit Notes are not required in V1**, but the Invoice data model must be built so Credit Notes can be introduced later (as a linked, separate entity referencing the original invoice) without altering the existing Invoice structure.

---

## 9. Projects

- A Project is created when a Lead (or an individual Lead Service, once approved) converts.
- A customer can add new services to an already-active Project at any time; each addition may spin up its own new Quotation and Invoice(s) under the same Project.
- **Project completion is an Admin-only action in V1.** The Client Dashboard reflects the completed status and shows completion documents once marked, but there is no client acknowledgment or digital sign-off step in V1 — that is a defined V2/V3 feature (client acknowledgment, completion certificate acceptance, digital sign-off).

---

## 10. Client Account Provisioning

**Client accounts are never created automatically.** A Lead's contact remains a Lead until the Admin explicitly decides to convert them — normally at the point a quotation is accepted and the Project is officially created. At that point:

1. Admin clicks **"Create Client Account."**
2. The system creates the Client login.
3. Credentials are sent by email.
4. All current and future Projects for that customer are linked to the new Client account.

This avoids creating unnecessary accounts for enquiries that never convert, and keeps account creation entirely under business control.

---

## 11. Documents

- Documents attach to **both Lead and Project** independently, not just one or the other.
  - **Lead-stage examples:** property drawings, requirement images, requirement PDFs.
  - **Project-stage examples:** contracts, quotations, site photos, completion reports, warranty documents.
- **V1 upload permission: Admin only.** Clients have read/download access but cannot upload. Client-side uploads are an explicit future capability the architecture should accommodate.

---

## 12. Messaging

Messages are a **genuine two-way chat system** — this is explicitly distinct from Notifications.

**V1 requirements:**
- Two-way conversation between Admin and Client.
- Chronological message ordering.
- Read status (read/unread).
- Attachments — noted as a **future** enhancement, not required for V1 launch, but the message data model should not block adding it.

System Notifications (see §14) are a separate, one-way, event-driven mechanism and must not be conflated with Messages in the data model or the UI.

---

## 13. Timeline & Audit Log (two distinct records)

| | Timeline | Audit Log |
|---|---|---|
| **Purpose** | Human-readable business history | Technical/system-level record |
| **Audience** | Admin and Client-facing (where appropriate) | Internal/technical only |
| **Examples** | Lead Created, Service Added, Call Logged, Quote Sent, Payment Recorded, Project Completed, Site Visit skipped (with reason) | Field-level changes, system actions, technical metadata |

Every important business action must generate a Timeline entry. This is the **primary business history** of the platform and must never be reconstructable-only-by-inference — it is written explicitly at the time of the action, as part of the standard action lifecycle (§16).

---

## 14. Notifications

- Notifications are strictly **event-driven**, never triggered directly from a controller (`Controller → Service → Event → Notification Channel`). This decoupling is required specifically so that new channels (WhatsApp, SMS, Push) can be added in future versions without touching business logic.
- **V1 supports Email only.**
- Future channels (WhatsApp, SMS, Push Notifications) must be addable as new channel implementations against the same event system, not as a rebuild.

---

## 15. Global Search

V1 uses **simple indexed search** across:
- Lead Number, Project Number
- Client Name, Company Name, Phone, Email
- Quote Number, Invoice Number
- Service Name
- Status

**Explicitly out of scope for V1:** document content search, OCR, PDF indexing, and questionnaire-answer search. These are future enhancements and must not block V1 delivery.

---

## 16. Mandatory Action Lifecycle (applies to every business operation)

Every business action in the system — regardless of module — must follow this exact sequence. No module may skip or reorder any step:

```
Validation → Authorization → Database Transaction → Timeline Entry
    → Audit Log → Notification Event → Response
```

If any step in a multi-step database operation fails, the **entire transaction rolls back** — no partial writes are ever persisted.

---

## 17. Cross-Cutting Architectural Rules (carried from prior phases, restated for PRD completeness)

These are not new — they were established in business analysis and are restated here as binding requirements the PRD assumes throughout:

1. **Thin controllers** — validate request, call service, return response. No business logic in controllers.
2. **Service layer** owns all business rules.
3. **Repository layer** isolates all database queries; business logic never talks to the ORM directly.
4. **Modular isolation** — each module (Auth, Lead, Client, Services, Quotation, Invoice, Projects, Documents, Timeline, Notifications, Messages) owns its own controller, service, repository, validation, and routes.
5. **Zero duplicate logic** — shared logic is refactored into shared services, not copy-pasted.
6. **Backend-side validation always**, regardless of frontend validation.
7. **Soft delete only** — business records are never hard-deleted (except where legally mandated, e.g., a future right-to-erasure request, which is handled as an explicit exception process, not the default).
8. **Every list endpoint** supports search, pagination, sorting, and filtering.
9. **Security baseline:** JWT authentication, role-based (permission-based under the hood) authorization, rate limiting, Helmet, input validation; secure cookies and refresh tokens flagged for future hardening.
10. **Centralized error handling** — no repeated try/catch patterns across modules.
11. **All server errors are logged.**

---

## 18. V1 Module List (final)

| Module | In V1 |
|---|---|
| Public Website / Service Selection / Dynamic Wizard | ✅ |
| Lead Management (with Lead Services) | ✅ |
| Client Management (business/organization model) | ✅ |
| Service Catalog (data-driven, categories with hierarchy) | ✅ |
| Quotation (multi-service, versioned) | ✅ |
| Invoice (freeform, GST-compliant, immutable once issued) | ✅ |
| Payments (manual, partial payment tracking) | ✅ |
| Project Management (with Project Services, independent status) | ✅ |
| Documents (Lead + Project attachment, Admin upload only) | ✅ |
| Messages (two-way chat, Admin ↔ Client) | ✅ |
| Timeline & Audit Log | ✅ |
| Notifications (event-driven, Email only) | ✅ |
| Global Search (simple indexed) | ✅ |
| Admin Dashboard | ✅ |
| Client Dashboard | ✅ |
| Authentication (JWT, permission-based under the hood) | ✅ |

**Explicitly excluded from V1** (see §2.2), but architecturally protected for future addition: Vendor Portal, Staff/Sales roles, Role-Based Permission UI, Task Management, Calendar/Reminders, Questionnaire Builder, Payment Gateway, WhatsApp Integration, Automation Rules, Mobile Applications, Credit Notes, Client-side digital quote acceptance, Client-side project sign-off, Multi-user client company logins.

---

## 19. Open Items Carried Forward (non-blocking)

None of the following block schema or architecture design, but should be confirmed before or during Phase 4–5 as they affect finer implementation detail rather than structural shape:

- Exact list of Admin Dashboard metrics/widgets for V1 (conversion rate, revenue by service, overdue invoices, etc.) — to be finalized during UI/UX handoff since frontend design is already fixed separately.
- Hosting/deployment target and expected data volume (affects background job/queue needs, file storage strategy) — to be confirmed in Phase 10 planning but flagged for Phase 4 infra decisions (e.g., S3-compatible object storage for Documents regardless of host).
- Consent/privacy-policy acceptance capture on the public enquiry form (DPDP Act) — recommended for inclusion in Lead capture; to be confirmed.

---

## 20. Next Phase

This PRD is the approved foundation for **Phase 3 — Business Workflows**, where each module's exact state transitions, actor permissions, and edge-case handling (e.g., cancellations, service removal, mid-project changes) will be mapped in detail before any database design begins.
