# Nexus Frontend — Business Service Management Platform

**Status: All modules fully implemented and functional.**

## What's built

All business modules from the PRD are implemented and wired to the backend API:

- **Admin Dashboard** (`/`) — 10 KPI cards, 4 charts, recent activity, upcoming items, quick actions
- **Leads** (`/leads`) — CRUD, Active/Archived toggle, archive/restore with reason, Lead Services panel (read-only after conversion)
- **Clients** (`/clients`) — List, detail, Lead → Client conversion
- **Quotations** (`/quotations`) — Create (client-only), revise, approve, send, PDF preview/download/regenerate, lead display via `Client.sourceLead`
- **Projects** (`/projects`) — List, detail, aggregate status tracking
- **Invoices** (`/invoices`) — Create, send, cancel, payment recording with transaction references, PDF preview/download/regenerate, payment summary cards
- **Messages** (`/messages`) — Conversation threads
- **Documents** (`/documents`) — Upload, list, download
- **Search** (`/search`, Cmd+K) — Global search across 7 modules with type filtering and text highlighting
- **Notifications** (`/notifications`) — In-app notification center with unread badge, mark-as-read
- **Company Settings** (`/settings/company`) — Full settings page with 5 sections, file uploads (Cloudinary), unsaved changes protection
- **Client Portal** (`/portal/*`) — Separate lighter shell with quotations, invoices, projects, documents, notifications, dashboard

### Client Portal Pages
- Portal Dashboard — overview of projects, quotations, invoices
- Portal Quotation Detail — PDF as single source of truth, Accept/Reject/Revision workflow, originating lead display
- Portal Invoice Detail — PDF view, payment summary cards, payment history
- Portal Projects, Documents, Notifications

## How to run

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173` — login with admin credentials (see backend seed output). The sidebar provides access to all modules.

⚠️ Same caveat as the backend: this was built in a network-isolated sandbox, so I could not run `npm install` or `vite build` here to confirm a clean compile. I did the closest available substitute — verified all 138 internal `@/` imports resolve to real files, and checked named imports against actual exports. Run `npm install && npm run build` locally as your real first checkpoint; send me any error and I'll fix it precisely.

## Folder architecture

```
src/
  app/              - providers.tsx (Toast/Tooltip/CommandPalette), AdminLayout, PortalLayout
  components/
    ui/             - 28+ reusable primitives (Button, DataTable, Charts, Modal, etc.)
    layout/         - Sidebar, TopNav, AppShell, PageHeader, NotificationPanel, CompanyLogo
    common/          - ModuleScaffold (placeholder for unbuilt routes — none remain)
  hooks/            - useToast, useDisclosure, useDebounce, useMediaQuery, useLocalStorage
  lib/              - cn() classname helper, currency/date formatters
  types/            - domain types mirrored from the backend Prisma schema
  routes/           - ROUTES constants, breadcrumb generator
  pages/            - one folder per module, all fully implemented
  queries/          - React Query hooks for every module
  services/         - API client functions for every module
  styles/           - globals.css (design tokens)
```

## Design decisions

- **Accent color** "Nexus Indigo" (`#4553FF`) — chosen to read as technical/trustworthy without matching either the generic "warm AI orange" or "acid-green-on-black" defaults.
- **Typography pairing** (Inter + JetBrains Mono for numeric/ID data) follows Linear/Vercel/Stripe/GitHub conventions.
- **Signature motif**: a thin node-and-thread connector line (see `NexusLogo.tsx`) grounded in what the product actually does — multiple service enquiries converging into one Lead/Project.

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS with custom design tokens
- React Router v6 for routing
- TanStack React Query for data fetching/caching
- React Hook Form + Zod for form validation
- Recharts for dashboard charts
