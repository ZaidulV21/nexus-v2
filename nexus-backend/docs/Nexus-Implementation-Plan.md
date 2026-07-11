# Nexus — Implementation Plan
## Solo Developer | Node.js/TypeScript/Express/Prisma/PostgreSQL | Cloud VM Deployment

**Based on:** Technical Blueprint & Development Roadmap V1 (15 modules, 8 dependency layers)
**Builder:** Solo developer
**Target pace:** 2 weeks
**Deployment target:** Cloud VM (AWS EC2 / DigitalOcean / generic VPS)

---

## 1. Reality Check Before the Schedule

15 modules with the depth specified in the blueprint (versioned quotations, gapless invoice numbering under concurrency, independent per-service status tracking, full test suites per module) represents roughly **95–115 hours of focused solo work** by my estimate below. Two weeks at a sustainable 8hrs/day is **80 hours**.

Rather than compress every module's testing and validation to hit an artificial 15-of-15 finish line — which is how technical debt gets baked in on week one — I'm proposing:

- **Sprint 1 (2 weeks, your stated target): Modules M0–M10.** This is the entire revenue-critical backbone — auth, catalog, leads, clients, quotations, projects, invoicing/payments. By the end of Sprint 1, the platform can take an enquiry through to a paid, tracked project. This is a genuinely usable core.
- **Sprint 2 (3–5 additional days): Modules M11–M14.** Documents, Messages, Search, Dashboards. These are supporting modules — valuable, but the platform is not blocked without them for another week and a half.

If you'd rather keep a hard 2-week deadline for all 15 modules regardless, tell me and I'll compress Sprint 1's testing depth instead — I just want that trade-off to be your explicit choice, not a silent one.

---

## 2. Effort Estimate Per Module

| Module | Complexity driver | Est. hours |
|---|---|---|
| M0 — Core Infrastructure | Foundational, low logic, high leverage | 5 |
| M1 — Auth & Users | JWT + permission-based RBAC scaffold | 7 |
| M2 — Timeline & Audit Log | Polymorphic logging, used by everything after | 5 |
| M3 — Notification Core | Event/channel abstraction | 5 |
| M4 — Status Engine | Full workflow graph, transition rules, override logic | 8 |
| M5 — Service Catalog | Category hierarchy, versioned questionnaires | 6 |
| M6 — Lead Module | Multi-service transactional intake, questionnaire snapshotting | 9 |
| M7 — Client Module | Conversion flow, credential issuance | 6 |
| M8 — Quotation Module | Versioning, multi-service line items, server-calculated totals | 9 |
| M9 — Project Module | Independent per-service status, aggregate status computation | 9 |
| M10 — Invoice & Payment | Gapless sequential numbering under concurrency, GST, immutability | 10 |
| **Sprint 1 subtotal** | | **~79 hrs** |
| M11 — Documents | Storage abstraction, polymorphic attachment | 6 |
| M12 — Messages | Two-way conversation model | 6 |
| M13 — Global Search | Thin composition layer over existing repos | 4 |
| M14 — Dashboards | Read-only aggregation (pending your metric confirmation) | 5 |
| **Sprint 2 subtotal** | | **~21 hrs** |
| **Total** | | **~100 hrs** |

Sprint 1 at ~79 hours fits your 80-hour, 2-week budget almost exactly — with essentially zero slack for illness, environment problems, or a genuinely tricky bug (M10's concurrency-safe numbering is the most likely place for one). I've built a half-day buffer into the schedule below to absorb this rather than pretend it won't happen.

---

## 3. Infrastructure Setup (Day 0, before Module work starts)

Before M0's code is written, the environment itself needs to exist:

1. **VM provisioning** — spin up the Cloud VM (EC2/DigitalOcean/VPS), install Node.js LTS, PostgreSQL, and a process manager (pm2 or systemd service).
2. **Repository setup** — initialize Git repo, set up `main` + `develop` branch structure (or trunk-based with feature branches per the blueprint's Git workflow — solo dev, so trunk-based with short-lived feature branches is simpler and recommended).
3. **Environment separation** — even solo, keep a `.env.development` (local) and `.env.production` (VM) from day one; do not develop directly against the production database.
4. **CI basics** — a simple GitHub Actions (or equivalent) workflow that runs `npm test` on push, even if deployment itself stays manual for now. Catching a broken module before it's "done" is cheap; catching it after M14 is expensive.
5. **Database provisioning** — Postgres instance created on the VM (or a managed Postgres add-on if your VM provider offers one — recommended over self-managing Postgres on the same VM as the app, for easier backups).

**Estimated time:** 3–4 hours. Do this before Day 1 of module work, not concurrently with M0.

---

## 4. Sprint 1 Day-by-Day Schedule (10 working days)

This sequencing strictly follows the blueprint's dependency layers — no module starts before its dependencies are merged and passing.

| Day | Module(s) | Notes |
|---|---|---|
| **Day 1** | M0 — Core Infrastructure | Full day. Everything downstream depends on this being solid — do not rush the error handler/transaction wrapper. |
| **Day 2** | M1 — Auth & Users | Full day. Get the permission-based (not role-based) authorization pattern right here — every later module's routes lean on it. |
| **Day 3** | M2 — Timeline & Audit Log, M3 — Notification Core | Half day each. Both are cross-cutting services with a similar shape; efficient to build back-to-back. |
| **Day 4** | M4 — Status Engine | Full day. This encodes the entire workflow graph from the PRD — worth the full day even though it has no public API surface, because M6 and M9 both depend on it being correct. |
| **Day 5** | M5 — Service Catalog | Full day. Category hierarchy + versioned questionnaires. |
| **Day 6** | M6 — Lead Module | Full day. Highest-risk module so far — multi-service atomic intake with per-service questionnaire snapshotting. |
| **Day 7 (AM)** | M6 — finish + integration tests | Half day buffer carried from Day 6 if needed. |
| **Day 7 (PM)** | M7 — Client Module | Half day — conversion flow is well-scoped once M6 is solid. |
| **Day 8** | M8 — Quotation Module | Full day. Versioning correctness is the thing to protect here — test the "revise 3 times, all versions still readable" case explicitly. |
| **Day 9** | M9 — Project Module | Full day. The aggregate-status computation (derived, never stored) is the module's core proof point — don't skip that test. |
| **Day 10** | M10 — Invoice & Payment Module | Full day, likely spills into buffer. This is the legally sensitive module (gapless sequential numbering under concurrency) — if only one module gets extra scrutiny, make it this one. |

**Built-in buffer:** Day 7's split absorbs one day of slippage. If M10 needs the buffer instead (likely, given its complexity), M6/M7 need to land exactly on schedule with no rework — worth flagging now rather than discovering it on Day 7.

**End of Sprint 1 deliverable:** A backend that can take a multi-service public enquiry, track each service independently through to approval, convert the lead to a client, issue and revise quotations, create a project with independently-progressing services, and issue GST-compliant invoices with manually tracked partial payments — all with passing integration tests and running on your Cloud VM.

---

## 5. Sprint 2 Schedule (3–5 days, following Sprint 1)

| Day | Module(s) |
|---|---|
| **Day 11** | M11 — Documents Module (storage abstraction + polymorphic attachment) |
| **Day 12** | M12 — Messages Module (two-way conversation) |
| **Day 13 (AM)** | M13 — Global Search |
| **Day 13 (PM) – Day 14** | M14 — Dashboards & Reporting — **blocked until you confirm the exact metric list** (flagged as open in the PRD, §19). I'll need that before this module starts, or I'll build against a reasonable default set and flag it for revision. |

---

## 6. Daily Working Routine (every day, every module)

Per the blueprint's Git workflow, applied practically for a solo dev:

1. Branch: `feature/m<n>-<module-name>`
2. Implement files per that module's blueprint spec (routes → controller → service → repository → validation).
3. Write and run that module's test cases locally against the dev database.
4. Walk through the module's acceptance criteria explicitly — check each one off, don't eyeball it.
5. Merge to `main`, commit as `feat(m<n>-<module-name>): <summary>`.
6. **Deploy to the VM at the end of each completed module, not just at the end of the sprint.** Catching a deployment/environment issue on Day 2 costs an hour; catching it after 10 modules are built costs a day. I'd recommend a lightweight deploy script from Day 1 (even a manual `git pull && npm run build && pm2 restart`) rather than leaving deployment as a Day 10 afterthought.

---

## 7. Deployment Shape on the Cloud VM

Since "not decided yet" wasn't picked and you confirmed a Cloud VM specifically:

- **Single VM, two environments recommended if resources allow:** one Postgres database + app instance for a lightweight staging check, one for production — even on a single small VM this can be two Docker containers or two systemd services on different ports, rather than testing directly against production data.
- If a second environment isn't feasible on your current VM budget, at minimum: **never run integration tests against the same database instance real client data will eventually live in.**
- Recommend fronting the app with Nginx as a reverse proxy (SSL termination, rate limiting at the edge in addition to the app-level rate limiting from M0) — a common gap when deploying Express apps directly.

---

## 8. Immediate Next Step

Say **"Start Day 0"** and I'll walk through infra setup, or **"Build M0"** if your VM/repo/CI is already in place and you want to go straight into module work.

One open item before Sprint 2 can be scheduled precisely: I still need your confirmed list of Admin/Client dashboard metrics (flagged in the PRD as non-blocking for Sprint 1, but it does block M14 specifically) — no rush, just flagging it now so it doesn't surprise us on Day 13.
