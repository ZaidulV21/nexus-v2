# Nexus — Business Service Management Platform (Backend, V1)

This is the complete V1 backend implementation, built module-by-module exactly per `docs/Technical-Blueprint-Development-Roadmap-V1.md`, following the decisions locked in `docs/PRD-Business-Service-Management-Platform-V1.md`.

## ⚠️ There is no frontend in this zip

Per the PRD, the frontend is explicitly deferred — it will be built after this backend is verified, matching a pre-existing design you provide separately. This zip is a **REST API only**. There is nothing to view in a browser as a UI; you "preview" it by sending HTTP requests and reading JSON responses, or by running the automated tests.

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
npx prisma generate
npx prisma migrate dev --name init
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

Every module follows the same structure (`.routes.ts` → `.controller.ts` → `.service.ts` → `.repository.ts` → `.validation.ts` → `.types.ts`), and every state-changing action follows the mandatory lifecycle: **Validation → Authorization → Transaction → Timeline → Audit → Notification → Response**.

## ⚠️ Important: this environment could not install dependencies or compile the code

This project was built in a network-isolated sandbox. I could not run `npm install`, `tsc`, or the Jest test suite here to confirm a clean compile — **you must do this as the first step** after unzipping, before assuming the code is runnable as-is. I've reviewed every file for correctness and internal consistency, and the architecture/logic faithfully implements every PRD and blueprint decision, but a first local build is the only way to catch environment-specific TypeScript issues (e.g. minor type mismatches Prisma's generated client introduces) that only surface at compile time.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL to your Postgres instance, set JWT_SECRET

# 3. Generate Prisma client and run the first migration
npx prisma generate
npx prisma migrate dev --name init

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
Validates every module's business logic in isolation (~35 test files: status transitions, GST math, versioning, aggregate status, permission checks, etc.). Run this first, always — it's the cheapest signal.

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

- No payment gateway — payments are manually recorded by Admin (PRD §8.2).
- Questionnaires are developer-seeded, not admin-editable (PRD §5) — see `prisma/seed.ts` for the placeholder question set; replace with real questions per service before go-live.
- Email notification channel uses **Resend** (`src/modules/email/email.service.ts`) — requires `RESEND_API_KEY` env var; `EMAIL_FROM` and `APP_URL` optional with sensible defaults. Missing API key → emails silently skipped.
- `s3Storage.provider.ts` is a stub — implement before deploying to production; `local` storage driver works for development as-is.
- Admin Dashboard metrics (`adminDashboard.service.ts`) use a reasonable default set, flagged in the PRD as pending your confirmation (§19) — adjust freely, the module boundary won't change.

## What to do next

1. `npm install` and fix any compile errors surfaced (see warning above).
2. Review `prisma/seed.ts`'s placeholder questionnaires and replace with your real per-service question sets.
3. Wire the Email channel to a real provider.
4. Once M0–M10 (Sprint 1 scope) are verified locally, proceed to frontend integration per the PRD — the frontend was explicitly deferred and must match your existing design exactly.
