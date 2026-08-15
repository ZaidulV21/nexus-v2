# Nexus — Business Service Management Platform (Backend, V1)

This is the V1 backend implementation, built module-by-module exactly per `docs/Technical-Blueprint-Development-Roadmap-V1.md`, following the decisions locked in `docs/PRD-Business-Service-Management-Platform-V1.md`.

> **Phase 17 note:** this README was written in an earlier, backend-only era and contains
> outdated claims (a missing frontend, "cannot compile", single baseline migration). The
> current repo has a full frontend (`../nexus-frontend`) and a verified build/test suite.
> The authoritative, up-to-date reference is **`../ARCHITECTURE.md`** (repo root).

## ⚠️ There is no frontend in this zip

This statement is outdated. The repository root now contains `nexus-frontend/` — the
React 18 + Vite + Tailwind 3 SPA with the public website, admin CRM and client portal.
This README's backend instructions below remain valid for the API alone.

## How to test and preview this in VS Code

### 1. Open the project
```bash
unzip nexus-backend.zip
code nexus-backend
```
VS Code will prompt you to install the recommended extensions (`.vscode/extensions.json`) — accept it. You need at minimum **REST Client** (to fire API requests from inside the editor) and **Prisma** (schema syntax highlighting).

### 2. Start a local database
A ready-made Docker Postgres is included, matching `.env.example` exactly:
```bash
docker compose up -d
```
(No Docker? Point `DATABASE_URL` in your `.env` at any Postgres instance instead.)

### 3. Install, migrate, seed
```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
```
The seed command prints an Admin login (`admin@nexus.local` / a generated password, or your own via `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`) and creates your 6 baseline services.

### 4. Run it
```bash
npm run dev
```
Or press **F5** in VS Code (a "Debug Nexus Server" launch config is included in `.vscode/launch.json`) to run it with breakpoints enabled.

### 5. Preview / exercise the API — three ways

- **`requests.http` (recommended, fastest):** open this file in VS Code, click "Send Request" above each block, top to bottom. It walks the entire flow — enquiry → lead → quotation → approval → client conversion → project → invoice → payment — and auto-chains IDs between requests so you don't copy-paste anything. This is the closest thing to a "preview" this backend has right now.
- **Automated tests:** click the Testing flask icon in VS Code's sidebar (from the Jest extension) to run/debug any test individually, or `npm test` in the terminal.
- **Any REST client:** Postman/Insomnia/curl against `http://localhost:4000/api/...` work identically — `requests.http` is just the fastest way to do this without leaving the editor.

### 6. Debugging
Set breakpoints directly in `.ts` files (no separate build step needed — `ts-node-dev` handles it) and use the "Debug Nexus Server" launch config, or "Debug Jest Tests (current file)" for a specific test.

---

## What's included

All 15 modules across 8 dependency layers:

| Layer | Modules |
|---|---|
| 0 — Foundation | M0 Core Infrastructure |
| 1 — Cross-cutting | M1 Auth & Users, M2 Timeline & Audit Log, M3 Notification Core, M4 Status Engine |
| 2 — Catalog | M5 Service Catalog |
| 3 — Lead | M6 Lead Module |
| 4 — Client | M7 Client Module |
| 5 — Commercial | M8 Quotation, M9 Project, M10 Invoice & Payment |
| 6 — Supporting | M11 Documents, M12 Messages |
| 7 — Platform | M13 Global Search, M14 Dashboards |

> The M0–M14 numbering is the original build plan. The current `src/modules/` contains 23
> modules — the original set plus `company`, `contact`, `email`, `entity-ref`, `otp`, `payments`,
> `pdf`, `search`, `seo` and more — each following `.routes.ts → .controller.ts → .service.ts →
> .repository.ts → .validation.ts → .types.ts`. See `../ARCHITECTURE.md` §7.3 for the full inventory.

Every state-changing action follows the mandatory lifecycle: **Validation → Authorization → Transaction → Timeline → Audit → Notification → Response**.

## ⚠️ Important: this environment could not install dependencies or compile the code

This note is outdated. The backend builds cleanly (`npm run build`) and the Jest unit suite
passes (**28 suites / 467 tests**, re-verified in Phase 17; no database needed). The
end-to-end harnesses below require a running server on `:4000` and a real Postgres.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL to your Postgres instance, set JWT_SECRET

# 3. Apply the migrations and generate the Prisma client
#    The migration history is: baseline + phase 12 (admin UX) + phase 13a/13b (CMS
#    normalization) + phase 16 (indexes) — see ARCHITECTURE.md §6.
npx prisma migrate deploy
npx prisma generate

# 4. Seed permissions, a default Admin user, and baseline service catalog
npm run prisma:seed
# Default admin login printed to console (or set SEED_ADMIN_EMAIL /
# SEED_ADMIN_PASSWORD env vars before seeding to choose your own)

# 5. Start the dev server
npm run dev
```

Server starts on `http://localhost:4000` (or `PORT` from `.env`). Health check: `GET /health`.

## Verifying everything works before touching the frontend (optimized order)

Three tiers, fastest/cheapest first. Stop and fix before moving to the next tier if anything fails — a failure at tier 1 will always show up again at tier 3, just slower to diagnose.

### Tier 1 — Unit tests (seconds, no database needed)
```bash
npm test
```
Validates every module's business logic in isolation (**28 test suites / 467 tests**:
status transitions, GST math, versioning, aggregate status, payment idempotency, permission
checks, etc.). Run this first, always — it's the cheapest signal.

### Tier 2 — Automated end-to-end smoke test (one command, real database)
```bash
# terminal 1
npm run dev

# terminal 2, once the server is up
npm run smoke-test
```
This runs `scripts/smoke-test.js` — 20 checks against the real running API and real database, covering the full golden path (multi-service enquiry → quotation → approval → client conversion → project → invoice → payment) **and** the specific failure modes worth verifying per module: atomicity rollback, illegal status transitions, re-conversion rejection, premature project completion, overpayment rejection, invoice-number preservation on cancellation, and public/admin catalog visibility. Prints a pass/fail line per check and a summary — this is the fastest way to know "is the whole system wired correctly" without clicking through requests by hand.

### Tier 3 — Manual spot-checks (only for what Tier 2 can't cover)
Open `requests.http` for anything you want to inspect by eye (e.g. reading the full JSON shape of a response before the frontend consumes it) or test cases that need two separate logins, like:
- **Client-to-Client access isolation** (E9 in `requests.http`): log in as two different Clients, confirm neither can read the other's conversation or documents.
- **Concurrent invoice numbering**: fire several `POST /invoices` requests at once (e.g. with a tool like `autocannon` or a quick `Promise.all` of fetches) and confirm every number is unique and sequential with no gaps — this is the one thing worth stress-testing beyond what a single-threaded smoke test proves.

Everything in Tier 2 is safe to re-run repeatedly — each run creates fresh Leads/Clients/Invoices rather than depending on prior state, so you can run `npm run smoke-test` after every code change with no manual cleanup.

### Phase 8 + Phase 9 regression harness (Lead → Client → Quotation → Project lineage)

A deeper black-box regression suite (`scripts/regression-run.js` + `scripts/regression-helpers.js`) that walks the entire Phase 8/9 data lineage end-to-end and verifies integrity at every step. Run it **after any major change to the Lead → Client → Quotation → Project flow** (new statuses, quotation versioning/revise logic, project creation from accepted quotations, sub-service derivation, invoicing, timeline/audit events).

**What it tests (9 tests, 83 checks):**
- Test 1 — multi-service/multi-sub full lineage (Electrical → Wiring + DB Panel + Website) through to a project with derived `project_sub_services` rows.
- Test 2 — single-service lineage (Interior → Painting).
- Test 3 — manual quotation create, revise/edit/delete items with grand-total recompute, and all validation negatives (missing client, empty items, mismatched/inactive sub-service).
- Test 4 — pre-Phase-8 quotations still render, revise, approve, send, and show in the client portal (synthesises a legacy-shaped quotation — all items without `subServiceId` — if the baseline has none).
- Test 5 — pre-Phase-9 projects still render, run the service status workflow, and show in the client portal (falls back to a project created earlier in the same run when no pre-Phase-9 project exists).
- Test 6 — invoice creation from new + existing projects with quotation totals unchanged.
- Test 7 — repeat enquiries convert to the SAME client (no duplicate accounts) and service history spans multiple conversions.
- Test 8 — timeline/audit events contain no duplicates (esp. a single `QUOTATION_ACCEPTED`).
- Test 9 — direct DB integrity chains and an orphan-FK scan across the whole database.

**How to run it:**
```bash
# terminal 1 (leave running)
npm run dev

# terminal 2, once the server is up
npm run regression:test
```
Equivalent direct invocation: `node scripts/regression-run.js`. Each run creates fresh Leads/Clients/Quotations/Invoices, so it is safe to re-run repeatedly. It exits non-zero if any check fails and prints `PASS`/`FAIL` per check with a summary (expect `83/83` on a healthy build).

**Environment requirements:**
- Backend running on `http://localhost:4000` (see `BASE` in `regression-helpers.js`).
- A real Postgres database (the harness reads/writes via Prisma directly, e.g. for client passwords and Test 9's integrity scan).
- Seeded Admin login `admin@nexus.local` / `ChangeMe123!` (or match the credentials in `regression-helpers.js`).
- Node 18+ (uses the built-in `fetch`).
- The seeded service catalog (Interior/Electrical/Website/CCTV) must exist. The harness resolves these **by slug** and creates the sub-services it depends on (Painting/Flooring/Lighting under Interior, plus an inactive CCTV sub) on demand, so it works against a fresh `prisma migrate reset` + seed without hard-coded UUIDs.

## Project structure

```
src/
  config/          - env loading, Prisma client singleton
  core/
    errors/        - typed AppError hierarchy
    middleware/    - error handler, auth, authorization, security
    utils/         - response formatting, pagination, transaction wrapper
    storage/       - pluggable file storage (local dev / S3 prod stub)
  modules/
    auth/          - M1
    timeline/       - M2 (timeline half)
    audit/          - M2 (audit half)
    notifications/  - M3
    status-engine/  - M4
    catalog/        - M5 (categories + services)
    lead/           - M6
    client/         - M7
    quotation/      - M8
    project/        - M9
    invoice/        - M10
    documents/      - M11
    messages/       - M12
    search/         - M13
    dashboard/      - M14
  app.ts           - Express app assembly, all routes mounted
  server.ts        - bootstrap
prisma/
  schema.prisma    - full data model, all 15 modules
  seed.ts          - permissions, default Admin, baseline catalog
docs/              - PRD, technical blueprint, and implementation plan for reference
.vscode/           - debug configs, recommended extensions, workspace settings
requests.http      - REST Client flow: enquiry -> quotation -> client -> project -> invoice -> payment
docker-compose.yml - local Postgres for development
```

## Known scope limitations (by design, per the PRD)

- ~~No payment gateway~~ **Outdated** — a Razorpay online-payments module is implemented in `src/modules/payments/` (see `PAYMENTS.md`). Offline manual recording (PRD §8.2) remains fully supported as the second channel.
- Questionnaires are developer-seeded, not admin-editable (PRD §5) — see `prisma/seed.ts` for the placeholder question set; replace with real questions per service before go-live.
- Email notification channel uses **Resend** (`src/modules/email/email.service.ts`) — requires `RESEND_API_KEY` env var; `EMAIL_FROM` and `APP_URL` optional with sensible defaults. Missing API key → emails silently skipped.
- `s3Storage.provider.ts` is a stub — implement before deploying to production; `local` storage driver works for development as-is.
- Admin Dashboard metrics (`adminDashboard.service.ts`) use a reasonable default set, flagged in the PRD as pending your confirmation (§19) — adjust freely, the module boundary won't change.

## What to do next

1. `npm install` and fix any compile errors surfaced (see warning above).
2. Review `prisma/seed.ts`'s placeholder questionnaires and replace with your real per-service question sets.
3. Wire the Email channel to a real provider.
4. Once M0–M10 (Sprint 1 scope) are verified locally, proceed to frontend integration per the PRD — the frontend was explicitly deferred and must match your existing design exactly.
