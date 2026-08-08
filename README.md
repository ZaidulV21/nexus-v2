# Nexus — Business Service Management Platform

A full-stack platform for managing business service operations: lead capture, client management, quotations, project tracking, invoicing, and payments. Includes a public marketing website, admin CRM, and client portal.

## Monorepo Structure

```
Nexus/
├── nexus-backend/      Node.js + Express + Prisma + PostgreSQL
├── nexus-frontend/     React + TypeScript + Vite + TailwindCSS
├── IMPLEMENTATION.md   Detailed phase-by-phase implementation docs
├── IMPLEMENTATION-PROGRESS.md   Progress tracker
├── PAYMENTS.md         Payment architecture & Razorpay integration reference
└── WORKFLOW.md         Business workflow documentation
```

## Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **ORM**: Prisma (PostgreSQL)
- **Auth**: JWT (bcrypt passwords, role-based access)
- **Payments**: Razorpay (online checkout via Checkout.js) + manual offline recording
- **Email**: Resend (HTML templates, fire-and-forget delivery)
- **Storage**: Cloudinary (images, PDFs) with local fallback
- **PDF**: PDFKit (branded quotation/invoice/receipt generation)
- **Testing**: Jest (253 tests, 21 suites)

### Frontend
- **Framework**: React 19 + TypeScript + Vite 5
- **Styling**: TailwindCSS v4 with custom design tokens
- **Routing**: React Router v7
- **Data**: TanStack React Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Animations**: Framer Motion

## Key Modules

| Module | Description |
|--------|-------------|
| Lead Management | Capture, pipeline tracking, archive/restore, auto status sync |
| Client Portal | Customer-facing dashboard, quotation/invoice PDFs, notifications |
| Quotations | Client-owned, versioned, PDF-generated, email delivery |
| Projects | Auto-created from accepted quotations, aggregate status tracking |
| Invoices & Payments | Auto-numbered, Razorpay online checkout, offline payment recording, status calculation, PDF |
| Notifications | In-app notification center, event-driven, real-time badge |
| Company Settings | Singleton config, file uploads (Cloudinary), branding cache |
| Global Search | Cross-module search (7 entity types), Cmd+K palette |
| Dashboard | Admin KPIs, charts, revenue tracking, upcoming items |
| PDF Generation | Branded quotation/invoice PDFs, fire-and-forget, cloud delivery |
| Service Images | Upload/manage service images, public website displays with fallback to icons |
| Dark Mode | Full dark/light/system theme with toggle, persisted across sessions |

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (or Docker)
- Resend API key (optional — emails silently skipped without it)
- Cloudinary credentials (optional — local file storage works for dev)
- Razorpay API keys (optional in dev — required for online payments; see [PAYMENTS.md](PAYMENTS.md))

### Backend

```bash
cd nexus-backend
npm install
cp .env.example .env          # configure DATABASE_URL, JWT_SECRET, RAZORPAY_KEY_ID/SECRET, etc.
npx prisma migrate deploy          # applies the single baseline migration
npx prisma generate
npm run prisma:seed            # seeds admin user + baseline services
npm run dev                    # starts on http://localhost:4000
```

### Frontend

```bash
cd nexus-frontend
npm install
cp .env.example .env          # set VITE_API_BASE_URL=http://localhost:4000/api
npm run dev                    # starts on http://localhost:5173
```

## Running Tests

### Backend (253 tests)
```bash
cd nexus-backend
npm test                       # all unit tests
npm run smoke-test             # end-to-end against running server
```

### Frontend
```bash
cd nexus-frontend
npx tsc --noEmit               # type checking
npm run build                  # production build
```

## Architecture Highlights

### Lead → Client → Quotation → Project Pipeline

```
Lead (wizard or admin-created)
  → OTP verified, email validated
  → Admin converts to Client (or auto-created during wizard)
    → Quotation created (client-owned, versioned)
      → Client accepts → Project auto-created
        → Invoice generated → Sent → Payment received
          (online via Razorpay checkout, or offline recorded by Admin)
```

### Public Website → CRM Integration

The Get Quote wizard (`/get-quote`) is an 8-step flow that:
1. Collects service selection, project details, file uploads
2. Creates a customer account (password set by customer)
3. Verifies email via 6-digit OTP (server-side bcrypt)
4. Creates a Client portal account + CRM Lead in one transaction

### Email Verification (OTP)

- 6-digit numeric OTP, bcrypt-hashed before storage
- 10-minute expiry, max 5 attempts, 60s rate limit
- One active OTP per email (resend invalidates previous)
- Passwords are never emailed

### Password Reset

- Standard forgot-password flow with bcrypt-hashed reset tokens
- 1-hour expiry, single-use tokens
- Email contains reset link — never the password itself

### Dark Mode

- CSS custom properties with Tailwind `darkMode: 'class'`
- 3-mode toggle: Light / Dark / System (follows OS preference)
- Theme persisted in `localStorage` with FOUC-prevention script
- Toggle available in Admin CRM, Client Portal, and Public Website
- All ~40 public site components migrated from `bg-white` to semantic `bg-surface`
- Smooth 200ms transitions, charts adapt automatically

## API Overview

### Public (no auth)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/public/auth/send-otp` | Send 6-digit OTP to email |
| `POST` | `/api/public/auth/verify-otp` | Verify OTP |
| `POST` | `/api/public/auth/forgot-password` | Request password reset |
| `POST` | `/api/public/auth/reset-password` | Set new password |
| `POST` | `/api/leads` | Create lead (with optional account creation) |
| `GET` | `/api/services/public` | Public service catalog |

### Admin (requires ADMIN role)
| Endpoint | Purpose |
|----------|---------|
| `/api/dashboard/admin/summary` | Dashboard KPIs, charts, activity |
| `/api/leads/*` | Lead CRUD, archive/restore |
| `/api/clients/*` | Client management, Lead → Client conversion |
| `/api/quotations/*` | Quotation CRUD, approve/send/revise |
| `/api/projects/*` | Project management |
| `/api/invoices/*` | Invoice CRUD, offline payment recording, payment history, receipts |
| `/api/payments` | Payment ledger (search, status/date/client filters, pagination) |
| `/api/notifications/*` | In-app notification center |
| `/api/company/settings` | Company settings CRUD |
| `/api/services/*` | Service CRUD, image upload/remove |
| `/api/pdf/:type/:id` | PDF generation/download (`QUOTATION`/`INVOICE`/`RECEIPT`) |
| `/api/search` | Global cross-module search |

### Client Portal (requires CLIENT role)
| Endpoint | Purpose |
|----------|---------|
| `/api/quotations/me`, `/api/quotations/me/:id` | View quotations, accept/reject/revise |
| `/api/invoices/me`, `/api/invoices/me/:id` | View invoices, payment history |
| `/api/payments/create-order`, `/api/payments/verify` | Razorpay online checkout |
| `/api/projects/me`, `/api/projects/me/:id` | View projects |
| `/api/notifications/*` | Client notifications |

See [PAYMENTS.md](PAYMENTS.md) for the complete payment architecture, lifecycle, endpoints, idempotency strategy, and deployment steps.

## Implementation Status

All core features are implemented and verified:

- **253/253 backend tests passing**
- **Frontend TypeScript: 0 errors**
- **Frontend production build: clean**

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for detailed phase-by-phase documentation.

## License

Private — All rights reserved.
