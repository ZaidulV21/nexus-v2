# Payments — Razorpay Integration & Payment Architecture

**Status:** ✅ IMPLEMENTED (Razorpay online payments + offline manual recording)
**Verified:** Backend tests 253/253 (21 suites) · Frontend `tsc --noEmit` clean
**Last updated:** 2026-07-31 — matches the current implementation exactly

This document is the authoritative reference for the Nexus payment architecture. It covers the full stack (backend, database, frontend), the online and offline payment flows, API contracts, idempotency guarantees, and everything needed to test and deploy the feature.

---

## 1. Overview

Nexus accepts payments against invoices through **two channels**, both recorded in the single `payments` table:

1. **Online — Razorpay Checkout.** A Client pays an invoice directly from the Client Portal. The portal calls a backend endpoint to create a Razorpay order, opens the Razorpay Checkout popup, and then calls a backend endpoint to verify the payment. Verification is **synchronous** (driven by the Checkout success handler) — no webhook is consumed today.
2. **Offline — manual recording.** An Admin records a payment received outside the gateway (bank transfer, cheque, cash, UPI, etc.) via the invoice detail page.

Both flows enforce the same business rules: no negative/zero amounts, no overpayment, no double-recording, no payments against cancelled invoices. An invoice's `displayStatus` (`DRAFT` → `SENT` → `PARTIALLY PAID` → `PAID`, or `CANCELLED`) is **always computed on the fly** from its successful payments — never stored.

---

## 2. Architecture

### 2.1 Backend module layout

The Razorpay integration is a dedicated module, wired into the existing invoice/payment core.

| Path | Responsibility |
|---|---|
| `nexus-backend/src/modules/payments/payments.routes.ts` | Routes: `POST /api/payments/create-order`, `POST /api/payments/verify`, `GET /api/payments` |
| `nexus-backend/src/modules/payments/payments.controller.ts` | HTTP handlers, Zod validation, response envelopes |
| `nexus-backend/src/modules/payments/payments.service.ts` | Order creation, signature verification, idempotency checks, transactional payment write, timeline/notification side-effects |
| `nexus-backend/src/modules/payments/payments.validation.ts` | Zod schemas: `createOrderSchema`, `verifyPaymentSchema` |
| `nexus-backend/src/modules/payments/payments.types.ts` | `CreateOrderResponse`, `VerifyPaymentResponse` |
| `nexus-backend/src/modules/payments/razorpay.d.ts` | Type declarations for the `razorpay` npm package |
| `nexus-backend/src/modules/payments/tests/payments.service.test.ts` | Unit tests for `verifyPayment` (8 tests) |

Payment persistence lives in the invoice module:

| Path | Responsibility |
|---|---|
| `nexus-backend/src/modules/invoice/invoice.repository.ts` | `paymentRepository` (create, listAll, findByGatewayTransactionId, sumForInvoice, listForInvoice, findByTransactionReference) |
| `nexus-backend/src/modules/invoice/invoice.service.ts` | Offline `recordPayment`, `sendReceipt`/`resendReceipt`, `displayStatus` enrichment (`enrichInvoice`) |
| `nexus-backend/src/modules/invoice/invoice.routes.ts` | Invoice + payment-history + receipt routes |

### 2.2 Frontend module layout

| Path | Responsibility |
|---|---|
| `nexus-frontend/src/pages/portal/PortalInvoiceDetailPage.tsx` | "Pay Online" flow: create order → load Checkout.js → open Razorpay popup → verify on success handler |
| `nexus-frontend/src/pages/payments/PaymentsPage.tsx` | Admin Payments list (`/admin/payments`) — search, status filter, pagination, rows navigate to invoice detail |
| `nexus-frontend/src/services/invoiceService.ts` | `createRazorpayOrder`, `verifyRazorpayPayment` API calls |
| `nexus-frontend/src/services/paymentService.ts` | `paymentService.list` for the admin payments list |
| `nexus-frontend/src/queries/usePayments.ts` | `usePaymentsList` hook |
| `nexus-frontend/src/queries/useInvoices.ts` | `useCreateRazorpayOrder`, `useVerifyRazorpayPayment`, `usePaymentHistory`, receipt hooks |
| `nexus-frontend/src/types/index.ts` | `Payment`, `RazorpayOrderResponse`, `VerifyPaymentResponse` types |

### 2.3 Key libraries

- **`razorpay`** npm package (`^2.9.8`) — server-side SDK for `orders.create`, `orders.fetch`, `payments.fetch`. Type declarations are hand-written in `razorpay.d.ts` (the package ships no types).
- **Razorpay Checkout.js** — loaded dynamically in the browser from `https://checkout.razorpay.com/v1/checkout.js` only when the Client clicks "Pay Online".
- **`crypto`** (Node built-in) — HMAC-SHA256 signature verification.
- **Prisma `$transaction`** — via `src/core/utils/transaction.ts` (`runInTransaction`, `maxWait: 5000ms`, `timeout: 15000ms`).

### 2.4 How the pieces connect

```
Client Portal (PortalInvoiceDetailPage)
   │
   ├── 1. POST /api/payments/create-order { invoiceId }        ──►  payments.service: createRazorpayOrder()
   │        ◄── { orderId, amount, currency, key, receipt }         → razorpay.orders.create({ amount: outstanding*100, INR, notes:{invoiceId, clientId} })
   │                                                                 → timeline PAYMENT_INITIATED
   │
   ├── 2. loadCheckout.js → new Razorpay(options) → rzp.open()   ──►  Client pays (card / UPI / netbanking / wallet)
   │
   └── 3. handler(response) → POST /api/payments/verify { payment_id, order_id, signature }
             ──►  payments.service: verifyPayment()
                     → HMAC-SHA256 signature check (order_id|payment_id, razorpayKeySecret)
                     → duplicate check by gatewayTransactionId (409 if present)
                     → razorpay.orders.fetch + razorpay.payments.fetch
                     → invoice ownership / not-cancelled / amount checks
                     → DB transaction: recompute outstanding → create Payment(SUCCESS, RAZORPAY)
                     → timeline PAYMENT_SUCCESSFUL + PARTIAL_PAYMENT/INVOICE_PAID
                     → notification event payment.successful
             ◄── { payment, invoice: { paidAmount, outstandingAmount, displayStatus } }
```

---

## 3. Payment lifecycle

1. **Create** — Admin creates an invoice (`POST /api/invoices`). Status `DRAFT`, no payments.
2. **Send** — Admin sends the invoice (`POST /api/invoices/:id/send`). Status flips to `ISSUED`; the client-facing `displayStatus` becomes **SENT**.
3. **View** — Client opens the invoice in the portal (`GET /api/invoices/me/:id`). If the invoice is not cancelled and has outstanding balance, the portal shows a **Pay Online** button.
4. **Initiate** — Client clicks **Pay Online**:
   - `POST /api/payments/create-order` returns a Razorpay order for exactly the **outstanding amount** (grand total minus already-paid successful payments).
   - Razorpay Checkout opens. A timeline event `PAYMENT_INITIATED` is recorded (fire-and-forget).
5. **Pay** — Client completes payment through Razorpay (card, UPI, netbanking, wallet).
6. **Verify** — The Checkout success handler calls `POST /api/payments/verify`. On success a `Payment` row (`status: SUCCESS`, `method: RAZORPAY`) is committed and the response returns the updated `paidAmount` / `outstandingAmount` / `displayStatus`.
7. **Reconcile** — `displayStatus` recomputes to **PARTIALLY PAID** (outstanding > 0) or **PAID** (outstanding = 0). Timeline records `PAYMENT_SUCCESSFUL` plus `PARTIAL_PAYMENT` or `INVOICE_PAID`; a `payment.successful` notification event is emitted to the client's email and in-app.
8. **Offline alternative** — Admin can record any received payment manually (`POST /api/invoices/:id/payments`, `status: SUCCESS`) at any point for non-gateway channels.
9. **Receipt** — Payment receipts are generated as PDFs (`GET /api/pdf/RECEIPT/:paymentId`) and emailed on demand via `POST /api/invoices/:id/payments/:paymentId/send-receipt` (or `/resend-receipt`).

### Payment statuses (`PaymentStatus` enum)

| Status | Meaning |
|---|---|
| `PENDING` | Reserved (not written by any current flow) |
| `SUCCESS` | Recorded successful payment (both Razorpay and manual flows) |
| `FAILED` | Reserved (not written by any current flow) |
| `REFUNDED` | Reserved for the planned refund flow (see §9) |

### Invoice `displayStatus` rules

Computed from payment state in `enrichInvoice()` (`invoice.service.ts`) and mirrored by `computeDisplayStatus()` in `payments.service.ts`:

| Condition | displayStatus |
|---|---|
| invoice `status = CANCELLED` | `CANCELLED` |
| invoice `status = DRAFT` | `DRAFT` |
| outstanding ≤ 0 | `PAID` |
| paidAmount > 0 | `PARTIALLY PAID` |
| invoice `status = ISSUED` | `SENT` |

Outstanding = grand total − sum of `SUCCESS` payments. Cancelled invoices always show outstanding 0. `OVERDUE` is **reserved** (no due-date support yet).

---

## 4. API endpoints

### 4.1 Razorpay module (`/api/payments`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/payments/create-order` | Client (JWT, actor `CLIENT`) | Create a Razorpay order for an invoice's outstanding balance |
| `POST` | `/api/payments/verify` | Client (JWT, actor `CLIENT`) | Verify a captured payment and record it against the invoice |
| `GET` | `/api/payments` | Admin (`invoice.view` permission) | Paginated payment list with filters |

**`POST /api/payments/create-order`**

Request body:
```json
{ "invoiceId": "<uuid>" }
```

Response (`200`):
```json
{
  "success": true,
  "data": {
    "orderId": "order_xxxxxxxx",
    "amount": 5000000,
    "currency": "INR",
    "key": "rzp_test_xxxxxxxx",
    "receipt": "INV-INV/2026-27/00001"
  }
}
```

Errors: `404 Invoice not found` (also returned when the invoice belongs to another client). Amount is the outstanding balance in **paise**.

**`POST /api/payments/verify`**

Request body:
```json
{
  "razorpay_payment_id": "pay_xxxxxxxx",
  "razorpay_order_id": "order_xxxxxxxx",
  "razorpay_signature": "<hex hmac>"
}
```

Response (`200`):
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "<uuid>",
      "amount": 50000,
      "method": "RAZORPAY",
      "status": "SUCCESS",
      "gatewayTransactionId": "pay_xxxxxxxx",
      "paidAt": "2026-07-31T12:00:00.000Z"
    },
    "invoice": {
      "id": "<uuid>",
      "paidAmount": 50000,
      "outstandingAmount": 50000,
      "displayStatus": "PARTIALLY PAID"
    }
  }
}
```

Errors:
- `400 Invalid payment signature` — HMAC-SHA256 mismatch.
- `409 Payment already processed` — the `razorpay_payment_id` already has a `Payment` row.
- `400 Razorpay order missing invoice reference` — the Razorpay order's `notes.invoiceId` is absent.
- `404 Invoice not found` — invoice missing, or not owned by the calling client.
- `400 Cannot record payment against a cancelled invoice`.
- `400 Invalid payment amount` / `400 Payment of X exceeds outstanding balance of Y` — zero/negative/overpayment.

**`GET /api/payments`**

Query params (all optional): `page`, `pageSize` (max 100), `search`, `sortBy` (default `paidAt`), `sortOrder` (`asc`|`desc`, default `desc`), `status`, `clientId`, `invoiceId`, `projectId`, `dateFrom`, `dateTo`.

Search matches invoice number, client contact/company name, project number, and transaction reference. Rows include `invoice { invoiceNumber, grandTotal, status }`, `client { contactName, companyName }`, `project { projectNumber }`.

### 4.2 Invoice module payment endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/invoices/:id/payments` | Admin (`invoice.create`) | Manually record an offline payment |
| `GET` | `/api/invoices/:id/payments?sort=asc\|desc` | `invoice.view` | Payment history for an invoice |
| `POST` | `/api/invoices/:id/payments/:paymentId/send-receipt` | Admin (`invoice.create`) | Email the payment receipt |
| `POST` | `/api/invoices/:id/payments/:paymentId/resend-receipt` | Admin (`invoice.create`) | Re-email the payment receipt |

**`POST /api/invoices/:id/payments`** request body:
```json
{
  "amount": 30000,
  "method": "Bank Transfer",
  "transactionReference": "UTR123456789",
  "referenceNote": "Optional note"
}
```
`amount` must be > 0 and ≤ outstanding. `transactionReference` is globally unique — duplicates are rejected.

### 4.3 Receipt PDF endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/pdf/RECEIPT/:paymentId` | Get (and generate if missing) the receipt PDF URL |
| `POST` | `/api/pdf/RECEIPT/:paymentId/regenerate` | Force-regenerate the receipt PDF |

### 4.4 Client-portal invoice endpoints used by the flow

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/invoices/me` | The client's own invoices (excludes `DRAFT`) |
| `GET` | `/api/invoices/me/summary` | Summary totals (excludes cancelled) |
| `GET` | `/api/invoices/me/:id` | Single invoice, enriched with `paidAmount`/`outstandingAmount`/`displayStatus` |

---

## 5. Webhook flow

### 5.1 Current implementation — synchronous, no webhook

There is **no webhook endpoint** in the codebase. Payment capture is verified through the Razorpay Checkout success handler, which posts the payment/order/signature triple to `POST /api/payments/verify`. The HMAC signature proves the payload was produced by Razorpay; the DB duplicate-check makes the write idempotent.

Consequences of this design (documented accurately):
- A payment that is captured by Razorpay but whose Checkout popup is closed/network fails **after** capture is never recorded (no server-side reconciliation). The client can re-open the popup and pay the outstanding amount again; the already-captured money is not reflected and would need manual refund/record.
- No server-side handling of `payment.failed`, `order.paid`, `refund.processed`, etc.

### 5.2 Recommended future design (not yet implemented)

When server-side reconciliation is required:

1. Add `POST /api/payments/webhook` (no JWT auth).
2. Verify the `x-razorpay-signature` header (HMAC-SHA256 of the raw request body with `RAZORPAY_KEY_SECRET`) before touching anything.
3. Handle at minimum `payment.captured`, `payment.failed`, and `refund.processed`.
4. Make handling idempotent on `gatewayTransactionId` (see §8) so Razorpay's retries never double-record.
5. Register the endpoint in the Razorpay Dashboard (Test Mode first), selecting the relevant events.

---

## 6. Environment variables

Both are read in `nexus-backend/src/config/env.ts`. They default to empty strings (the online-payments feature silently degrades — order creation fails at the SDK boundary and signature verification fails — so **set them before going live**).

| Variable | Required for online payments | Description |
|---|---|---|
| `RAZORPAY_KEY_ID` | Yes | Razorpay API key ID (e.g. `rzp_test_...` / `rzp_live_...`) |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay API key secret |
| `APP_URL` | For receipt email links | Backend host used to build portal URLs in emails |
| `VITE_API_BASE_URL` (frontend) | Yes | Frontend API base URL, default `http://localhost:4000/api` |

Related vars the flow relies on but does not define: `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `CLOUDINARY_*`/`STORAGE_DRIVER` (for receipt/invoice PDF storage).

---

## 7. Database schema changes

### 7.1 Migration `20260731000000_add_payment_status_and_relations`

The migration makes the `payments` table relation-aware and status-aware:

1. **`PaymentStatus` enum** created: `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`.
2. **New columns** on `payments`:
   - `clientId TEXT` (nullable initially)
   - `projectId TEXT` (nullable initially)
   - `status "PaymentStatus" NOT NULL DEFAULT 'SUCCESS'`
3. **Backfill**: existing rows get `clientId`/`projectId` copied from their parent invoice.
4. **Constraints**: `clientId` and `projectId` set `NOT NULL`; FKs added to `clients` and `projects` (`ON DELETE RESTRICT ON UPDATE CASCADE`).
5. **Indexes**: `payments_clientId_idx`, `payments_projectId_idx`, `payments_status_idx`.

Apply with:
```bash
cd nexus-backend
npx prisma migrate deploy
```

### 7.2 Migration `20260731220000_event_architecture_hardening`

The event-architecture hardening migration:

1. **`payments.receiptSentAt`** — `TIMESTAMP(3)` nullable. Set only when the receipt email is actually accepted by the provider; makes `sendReceipt`/`resendReceipt` idempotent and observable.
2. **`timeline_events.clientVisible`** — `BOOLEAN NOT NULL DEFAULT true` (reserved for per-event overrides; the service layer currently filters staff-only event types at query time).
3. **Index** `timeline_events(entityType, entityId, eventType)` — backs the dedupe/idempotency guard.
4. **Backfill**: PDF lifecycle events (`*_PDF_GENERATED`, `*_PDF_DOWNLOADED`) are removed from `timeline_events` (system events, already in the Audit Log), and existing business events are deduplicated (earliest row per `(entityType, entityId, eventType)` kept).

### 7.3 Current `Payment` model (`prisma/schema.prisma`)

| Field | Type | Notes |
|---|---|---|
| `id` | String (uuid) | PK |
| `invoiceId` | String | FK → `invoices`, relation `invoice` |
| `clientId` | String | FK → `clients`, relation `client` (indexed) |
| `projectId` | String | FK → `projects`, relation `project` (indexed) |
| `amount` | Decimal(12,2) | |
| `method` | String | `RAZORPAY` for online, free-form for offline |
| `status` | `PaymentStatus` | default `SUCCESS` (indexed) |
| `referenceNote` | String? | Offline notes |
| `recordedByUserId` | String | The client (online) or admin (offline) who triggered the record |
| `paidAt` | DateTime | default `now()` |
| `transactionReference` | String? | Offline UTR/reference (globally unique via service check) |
| `gatewayMetadata` | Json? | `{ order_id, payment_id, signature, gateway_status }` for Razorpay |
| `gatewayPaidAt` | DateTime? | Reserved (unused) |
| `gatewayPaymentUrl` | String? | Reserved (unused) |
| `gatewayStatus` | String? | Reserved (unused) |
| `gatewayTransactionId` | String? | `razorpay_payment_id`; used for dedupe |
| `receiptGeneratedAt` | DateTime? | Set by the receipt PDF generator |
| `receiptUrl` | String? | Set by the receipt PDF generator |

---

## 8. Transaction flow & idempotency strategy

### 8.1 Transaction flow (`verifyPayment`)

1. HMAC-SHA256 signature verified **before** any DB work (fails fast on tampered payloads).
2. `paymentRepository.findByGatewayTransactionId(payment_id)` — if a row exists → `409 Payment already processed`.
3. `razorpay.orders.fetch` + `razorpay.payments.fetch` — confirms the payment exists at the gateway and gives the authoritative amount.
4. `runInTransaction`:
   - `paymentRepository.sumForInvoice(invoiceId, tx)` — recompute paid-so-far **inside the transaction** (guards against concurrent over-payment).
   - Validate `amount > 0` and `amount ≤ grandTotal − paidSoFar`.
   - `paymentRepository.create({ ... }, tx)` — write the `SUCCESS` payment row.
5. After commit, `fireTimelineAndNotifications` records timeline events (`PAYMENT_SUCCESSFUL` + `INVOICE_PAID`/`PARTIAL_PAYMENT`) and fires notifications. Payloads are enriched with `paymentId`, `paymentMethod`, `paymentDate`, `invoiceId` so the automatic email renders the **receipt** template. A client-facing `payment.receipt_available` in-app notification is also emitted. All are fire-and-forget (`.catch(() => {})`) — they never fail the payment. Timeline and notification events are **deduplicated** (same `eventType`+entity within 60s) so a business action never appears/sends twice.

The offline `recordPayment` uses the same pattern and additionally rejects a duplicate `transactionReference` inside the transaction.

### 8.2 Idempotency strategy

| Layer | Mechanism |
|---|---|
| Authentication | Signature (HMAC-SHA256 over `orderId|paymentId`, secret = `RAZORPAY_KEY_SECRET`) proves Razorpay produced the payload |
| Duplicate payment | `findByGatewayTransactionId` pre-check → `409 Payment already processed` |
| Duplicate reference (offline) | `findByTransactionReference` pre-check inside the transaction → rejected |
| Overpayment / double-count | Outstanding recomputed inside the `$transaction` immediately before the write |
| Cancelled invoices | Payment refused with `400` |

**Known gap (from audit):** `gatewayTransactionId` has no **unique DB index**. Two concurrent identical `verify` requests can both pass the pre-check before either commits. In practice the Checkout handler fires once, but a hard guarantee would require a unique index on `gatewayTransactionId` (recommended: `CREATE UNIQUE INDEX payments_gateway_transaction_id_key ON payments (gatewayTransactionId) WHERE gatewayTransactionId IS NOT NULL`).

---

## 9. Refund architecture (planned, not implemented)

- The `REFUNDED` status already exists in the `PaymentStatus` enum, but **no refund flow is implemented** — no API endpoint, no refund fields (`gatewayRefundId`, `refundedAt`, `refundAmount` are absent), and nothing flips a payment to `REFUNDED`.
- Planned shape (recommendation, not built):
  - Add `gatewayRefundId`, `refundedAt`, `refundAmount` to the `Payment` model.
  - Add `POST /api/payments/:paymentId/refund` (Admin, `invoice.create`) → `razorpay.payments.refund` → set `status = REFUNDED`, store the refund metadata, emit timeline/notification.
  - Make it idempotent on `gatewayRefundId`.
  - Optionally reconcile via a `refund.processed` webhook once §5.2 is built.
- Until then, refunds are handled out-of-band and a refunded payment is not representable in the system.

---

## 10. Testing checklist

### 10.1 Automated

```bash
cd nexus-backend
npm test                       # 255 tests, 21 suites — includes payments.service.test.ts (8 tests)
npm run smoke-test             # end-to-end against a running server (real DB)
```

`payments.service.test.ts` covers: invalid signature rejection, duplicate-payment rejection, missing `notes.invoiceId`, invoice-not-owned-by-client, amount-exceeds-outstanding, successful record with correct balances (`PARTIALLY PAID`), full payment (`PAID`), and payment against cancelled invoice. Timeline/notification side-effects are mocked; the tests assert the enriched `payment.successful` payload (`paymentId`, `invoiceId`, `paymentMethod`) and the `payment.receipt_available` event.

### 10.2 Manual — online flow (Razorpay Test Mode)

- [ ] `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` set to **test** keys; checkout opens in test mode.
- [ ] Pay the full outstanding → invoice shows `PAID`; timeline shows `PAYMENT_SUCCESSFUL` + `INVOICE_PAID`.
- [ ] Pay part of the outstanding → invoice shows `PARTIALLY PAID`; timeline shows `PARTIAL_PAYMENT`.
- [ ] Make a second partial payment → amounts accumulate correctly.
- [ ] Re-submitting the same `verify` payload → `409 Payment already processed` (no double row).
- [ ] Create an order then try to verify it for a **different client's** invoice → `404`.
- [ ] Try to pay a **cancelled** invoice → rejected with `400`.
- [ ] Tamper with the signature → `400 Invalid payment signature`.
- [ ] Dismiss the checkout popup → nothing recorded, no timeline `PAYMENT_SUCCESSFUL`.
- [ ] Payments list (`/admin/payments`): search, status filter, date range, pagination all work; Razorpay rows show gateway column.

### 10.3 Manual — offline flow

- [ ] Admin records a full payment → `PAID`; receipt PDF generated + receivable.
- [ ] Admin records a partial payment with a UTR → `PARTIALLY PAID`.
- [ ] Duplicate `transactionReference` → rejected.
- [ ] Amount > outstanding → rejected.
- [ ] `send-receipt` / `resend-receipt` → client receives the branded payment-receipt email (subject `Payment Receipt — <invoice>`).

### 10.4 Regression

- [ ] Invoice numbering still gapless/sequential after payment activity.
- [ ] Cancelled invoices excluded from project/client summaries.
- [ ] Dashboard revenue figures (`Total Paid`, `Outstanding`) reflect new payments.

---

## 11. Deployment steps

### 11.1 Backend

```bash
cd nexus-backend
npm install
npx prisma generate
npx prisma migrate deploy        # applies 20260731000000_add_payment_status_and_relations
npm run build
```

1. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the environment (`.env` or the host's secret store). Use test keys first.
2. Confirm `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, and email/storage vars are set as before.
3. Restart the server. Verify `GET /health`.
4. Razorpay Dashboard: keys must be enabled for the account; enable **Test Mode** until a live payment is verified.

### 11.2 Frontend

```bash
cd nexus-frontend
npm install
npm run build                     # tsc --noEmit + Vite build
```

`VITE_API_BASE_URL` must point at the backend's `/api` prefix. No Razorpay-specific frontend config is required (the key is supplied per-checkout by `create-order`).

### 11.3 Go-live checklist

- [ ] Test keys → **live** keys in the Razorpay Dashboard and backend env.
- [ ] A live end-to-end payment recorded once against a real invoice.
- [ ] (Optional, see §5.2) Webhook endpoint built, registered, and verified before relying on it.
- [ ] Receipt email flow verified with live `RESEND_API_KEY`.

---

## 12. Known limitations & audit findings

These are the discrepancies/gaps surfaced during the audit. They are documented so the docs match the code exactly.

1. ~~**The receipt email template is only used by the `send-receipt`/`resend-receipt` flow.**~~ **FIXED.** The `payment.successful` (online) and `payment.recorded` (offline) payloads now include `paymentId` (plus `paymentMethod`, `paymentDate`, `invoiceId`), so the automatic email after a payment renders `payment-receipt.template`. The explicit `sendReceipt`/`resendReceipt` flow (`payment.receipt_sent`) also renders it.
2. **No unique DB constraint on `gatewayTransactionId`** (§8.2) — concurrent duplicate verifies could race past the pre-check.
3. **No server-side payment reconciliation** (§5.1) — payments captured by Razorpay but never verified are not recorded.
4. **Refunds are not implementable end-to-end** (§9) — `REFUNDED` is enum-only.
5. **`OVERDUE` status** remains reserved (StatusBadge supports it) but is never produced by the backend.
6. **Receipt "Sent" is now honest.** `sendReceipt`/`resendReceipt` only record `RECEIPT_SENT` on the timeline/audit and set `payments.receiptSentAt` when the email channel reports `SENT`; otherwise they record `RECEIPT_SENDING_FAILED`/`RECEIPT_SEND_FAILED` and throw `502`. The email channel treats a `null` result from `emailService.send` (e.g. `RESEND_API_KEY` unset) as not-sent.
7. **System events are out of the business timeline.** PDF generate/download and PDF regenerate are recorded only in the Audit Log; the `TimelineEvent` table keeps business events only, deduplicated per `(entityType, entityId, eventType)`, and client viewers are filtered so staff-only events (`INVOICE_CREATED`, `INVOICE_RESENT`) never reach the portal.
8. **Notification/email dedupe.** `notificationsService.emitEvent` skips an identical recent event (same `eventType`+entity within 60s) so each business action produces one email + one in-app notification, and returns the real email outcome (`SENT`/`SKIPPED`/`FAILED`).
9. **Client-scoped document access.** `GET /pdf/:documentType/:documentId` is now client-scoped via `pdfService.resolvePdfForViewer`: a CLIENT can only fetch their own QUOTATION/INVOICE/RECEIPT (404 otherwise, existence hidden; admins bypass). Receipts are auto-generated on successful payment capture (`verifyPayment`) so they exist before the client opens the portal.

---

## 13. Related files

- Backend: `nexus-backend/src/modules/payments/*`, `nexus-backend/src/modules/invoice/invoice.{routes,controller,service,repository}.ts`, `nexus-backend/src/modules/notifications/notifications.service.ts`, `nexus-backend/src/modules/notifications/channels/email.channel.ts`, `nexus-backend/src/modules/notifications/channels/channel.interface.ts`, `nexus-backend/src/modules/email/templates/payment-receipt.template.ts`, `nexus-backend/src/modules/pdf/{pdf.service.ts,pdf.controller.ts,templates/receipt.template.ts}`, `nexus-backend/src/modules/timeline/{timeline.service.ts,timeline.repository.ts}`, `nexus-backend/prisma/schema.prisma`, `nexus-backend/prisma/migrations/20260731000000_add_payment_status_and_relations/migration.sql`, `nexus-backend/prisma/migrations/20260731220000_event_architecture_hardening/migration.sql`, `nexus-backend/src/config/env.ts`, `nexus-backend/src/app.ts`.
- Frontend: `nexus-frontend/src/pages/portal/PortalInvoiceDetailPage.tsx`, `nexus-frontend/src/pages/payments/PaymentsPage.tsx`, `nexus-frontend/src/services/{paymentService,invoiceService}.ts`, `nexus-frontend/src/queries/{usePayments,useInvoices,keys}.ts`, `nexus-frontend/src/types/index.ts`.
- Workflow: see `WORKFLOW.md` (Invoice Lifecycle) for the business-process view.
