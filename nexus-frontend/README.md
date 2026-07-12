# Nexus Frontend — Design System & Application Shell

**Status: Phase 1 complete — design system + shell only, per your instruction. No business pages built yet.**

## What's in this build

- **Design tokens** (`src/styles/globals.css`, `tailwind.config.ts`): full light/dark color system, type scale (Inter + JetBrains Mono), radius scale (8/10/14/16px), soft multi-layer shadows, motion tokens.
- **28 reusable UI components** (`src/components/ui/`): every component you listed — Button, Input, Select, DataTable (sortable, paginated, with loading/empty/error states built in), StatusBadge, Timeline, ActivityFeed, Charts, Modal, Drawer, ConfirmDialog, Toaster, CommandPalette (⌘K), and more.
- **Application shell** (`src/components/layout/`, `src/app/`): fixed sidebar with mobile variant, sticky top nav, auto-generated breadcrumbs, notification panel, user menu. A separate, lighter shell for the Client Portal per the PRD's Admin/Client distinction.
- **Full routing structure**: every module from your build order (Leads, Clients, Quotations, Projects, Invoices, Messages, Documents, Timeline, Audit Logs, Search, Client Portal) has a real route and page file — each currently an honest "not yet built" placeholder (`ModuleScaffold`), not a fake dashboard mockup.
- **The review surface**: `/design-system` route assembles every component above in one page so you can see and interact with the actual design system live, rather than reading code.

## How to review it

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173/design-system` first — that's the page built specifically for your review. Then click through the sidebar to confirm the shell, routing, and empty-state placeholders feel right before any business page gets built.

⚠️ Same caveat as the backend: this was built in a network-isolated sandbox, so I could not run `npm install` or `vite build` here to confirm a clean compile. I did the closest available substitute — verified all 138 internal `@/` imports resolve to real files, and checked named imports against actual exports. Run `npm install && npm run build` locally as your real first checkpoint; send me any error and I'll fix it precisely.

## Folder architecture

```
src/
  app/              - providers.tsx (Toast/Tooltip/CommandPalette), AdminLayout, PortalLayout
  components/
    ui/             - the 28 reusable primitives
    layout/         - Sidebar, TopNav, AppShell, PageHeader, NotificationPanel, NexusLogo
    common/          - ModuleScaffold (honest placeholder for unbuilt routes)
  hooks/            - useToast, useDisclosure, useDebounce, useMediaQuery, useLocalStorage
  lib/              - cn() classname helper, currency/date formatters
  types/            - domain types mirrored from the backend Prisma schema
  routes/           - ROUTES constants, breadcrumb generator
  pages/            - one folder per module, matching your build order exactly
  styles/           - globals.css (design tokens)
```

## Design decisions worth knowing about

- **Accent color** "Nexus Indigo" (`#4553FF`) — chosen to read as technical/trustworthy without matching either the generic "warm AI orange" or "acid-green-on-black" defaults.
- **Typography pairing** (Inter + JetBrains Mono for numeric/ID data) directly follows your named references (Linear/Vercel/Stripe/GitHub all do this) rather than being a generic default.
- **Signature motif**: a thin node-and-thread connector line (see `NexusLogo.tsx`, used sparingly in empty states) — grounded in what the product actually does (multiple service enquiries converging into one Lead/Project), not decoration.
- **`ModuleScaffold`**: every unbuilt page route renders this rather than fabricated dashboard content, per your explicit instruction not to generate placeholder AI-style pages.

## Next step

Once you've reviewed `/design-system` and the shell, tell me to proceed and I'll build the **Admin Dashboard** module first (per your stated order), replacing its `ModuleScaffold` with the real page — wired to `GET /api/dashboard/admin/summary` on the backend.
