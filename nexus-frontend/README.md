# Nexus Frontend — Business Service Management Platform

**Status: All modules fully implemented. Public website redesigned with premium UX and live backend services.**

## What's built

All business modules from the PRD are implemented and wired to the backend API:

### Route Groups
- **Public Website** (`/`) — No auth required, always renders `PublicLayout`. Identical for guests, admins, and clients.
- **Admin CRM** (`/admin/*`) — Requires `ADMIN` role. Renders `AdminLayout` with sidebar navigation.
- **Client Portal** (`/portal/*`) — Requires `CLIENT` role. Renders `PortalLayout` with client-specific navigation.

### Admin CRM (`/admin/*`)
- **Dashboard** (`/admin/dashboard`) — 10 KPI cards, 4 charts, recent activity, upcoming items, quick actions
- **Leads** (`/admin/leads`) — CRUD, Active/Archived toggle, archive/restore with reason, Lead Services panel (read-only after conversion)
- **Clients** (`/admin/clients`) — List, detail, Lead → Client conversion
- **Quotations** (`/admin/quotations`) — Create (client-only), revise, approve, send, PDF preview/download/regenerate
- **Projects** (`/admin/projects`) — List, detail, aggregate status tracking
- **Invoices** (`/admin/invoices`) — Create, send, cancel, payment recording, PDF preview/download/regenerate
- **Search** (`/admin/search`, Cmd+K) — Global search across 7 modules with type filtering
- **Notifications** (`/admin/notifications`) — In-app notification center with unread badge
- **Settings** (`/admin/settings/company`) — Full settings page with 5 sections, file uploads
- **Documents** (`/admin/documents`) — Upload, list, download

### Client Portal (`/portal/*`)
- **Dashboard** (`/portal/dashboard`) — Overview of projects, quotations, invoices
- **Quotation Detail** — PDF as source of truth, Accept/Reject/Revision workflow
- **Invoice Detail** — PDF view, payment summary cards, payment history
- **Projects**, **Documents**, **Notifications**

### Public Website (`/`)
- **Homepage** (`/`) — 11-section long-form page: Hero (premium slider) → ClientLogos → ProblemSolution → Services → Process → Stats → Projects → Industries → Testimonials (carousel) → FAQs → CTA
- **Hero Slider** — 3 slides with manual arrows + dots, auto-rotate every 7s, pause on hover, touch swipe support, fade+slide transitions
- **Services** (`/services`, `/services/:slug`) — Live data from backend API, not hardcoded constants
- **Industries** (`/industries`) — Industry-specific solutions showcase
- **How It Works** (`/how-it-works`) — Visual 6-step process timeline
- **Projects** (`/projects`) — Featured project portfolio
- **About** (`/about`) — Company story, values, stats
- **Contact** (`/contact`) — Contact form with business details
- **Get Quote** (`/get-quote`) — 7-step customer journey with live service selection from API

## How to run

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173` — homepage renders as a public marketing site. Login redirects:
- Admin → `/admin/dashboard`
- Client → `/portal/dashboard`

## Folder architecture

```
src/
  app/              - providers.tsx, AdminLayout, PortalLayout, AuthContext, ProtectedRoute, PortalProtectedRoute
  components/
    ui/             - 28+ reusable primitives (Button, DataTable, Charts, Modal, etc.)
    layout/         - Sidebar, TopNav, AppShell, PageHeader, NotificationPanel, CompanyLogo
  hooks/            - useToast, useDisclosure, useDebounce, useMediaQuery, useLocalStorage
  lib/              - cn(), slugify(), currency/date formatters
  types/            - domain types mirrored from the backend Prisma schema
  routes/           - ROUTES constants (public/admin/portal), breadcrumb generator
  pages/            - admin/ and portal/ subfolders, all fully implemented
  queries/          - React Query hooks for every module + usePublicServices for public website
  services/         - API client functions for every module
  styles/           - globals.css (design tokens)
  public-site/      - Public Marketing Website
    components/     - Navbar (dynamic services from API), Footer, SectionHeader, PageHero, ServiceCard,
                      FAQAccordion, TestimonialCard, TestimonialsCarousel, motion (FadeIn/StaggerGroup/ScaleIn)
    sections/       - HeroSection (premium slider), ClientLogosSection, ProblemSolutionSection,
                      ServicesSection (live data), ProcessSection, StatsSection, ProjectsSection,
                      IndustriesSection, TestimonialsSection, FAQSection, CTASection
    pages/          - HomePage, ServicesPage (live data), ServiceDetailPage (live data),
                      IndustriesPage, HowItWorksPage, ProjectsPage, AboutPage, ContactPage,
                      ResourcesPage (disabled), GetQuotePage (live data)
    layouts/        - PublicLayout
    hooks/          - useQuoteWizard, useScrollSpy, useMobileMenu, usePublicCompany
    types/          - ServiceItem, IndustryItem, ProjectItem, TestimonialItem, FAQItem, QuoteWizardData
    constants/      - INDUSTRIES, PROCESS_STEPS, STATS, TESTIMONIALS, FAQS, NAVIGATION
```

## Architecture: Public Website Service Integration

The public website fetches services from the same backend API used by the Admin CRM:

- **`usePublicServices()`** — Fetches all active services, maps backend `Service` → public `ServiceItem` with auto-generated slugs
- **`usePublicServiceBySlug(slug)`** — Resolves a single service by URL slug from the active services list
- **`usePublicServiceList()`** — Returns just the array (for Navbar dropdown, etc.)

### How Live Synchronization Works

1. Admin creates/edits/archives/restores/deletes a service via the Admin CRM
2. All admin mutations call `queryClient.invalidateQueries({ queryKey: queryKeys.services.all })`
3. This invalidates `services.publicList` (child of `services.all`)
4. Public website pages using `usePublicServices()` automatically refetch
5. Changes appear immediately — no manual refresh needed

### Slug Generation

The backend `Service` type doesn't have a `slug` field. Slugs are generated on the frontend via `slugify()` (from `@/lib/utils`) when mapping backend data to `ServiceItem`. Example: "Interior Design" → "interior-design".

## Architecture: Company Settings Integration

The public website consumes the same Company Settings API as the Admin Panel. No duplicate endpoints.

- **`usePublicCompany()`** — Wraps the existing `useCompanySettings()` hook with graceful fallbacks for empty fields
- Shares the same React Query cache key (`['company', 'detail']`) as the Admin Panel — single API call, reused everywhere
- 60-second stale time means the settings are fetched once and cached across all public pages

### What's Dynamic

| Component | Dynamic Fields |
|-----------|---------------|
| Navbar | Logo image, Company name (first letter fallback) |
| Footer | Logo, Company name, Tagline, Full address, Phone, Email, Social links (Facebook, LinkedIn, Twitter, Instagram), Copyright text |
| Contact Page | Address, Phone, Email (sections hidden when empty) |
| About Page | Company name in hero and story text, City/State in location references |

### Graceful Fallback Strategy

- If `companyName` is empty → falls back to "Nexus Managed Services"
- If `logoUrl` is null → shows first letter of company name in a colored square
- If `phone` is empty → Phone row hidden in Footer and Contact page
- If `email` is empty → Email row hidden
- If `address` fields are all empty → Address row hidden, falls back to hardcoded address
- If social links are empty → Social icons section hidden entirely
- Never shows "undefined", "null", or empty strings

## Design decisions

- **Accent color** "Nexus Indigo" (`#4553FF`) — technical/trustworthy without generic AI defaults.
- **Typography pairing** (Inter + JetBrains Mono for numeric data) follows Linear/Vercel/Stripe conventions.
- **Signature motif**: thin node-and-thread connector line grounded in what the product does.
- **Hero slider**: Premium full-width slider with manual navigation (arrows + dots), auto-rotate every 7s, pause on hover, touch swipe, AnimatePresence fade+slide transitions.
- **Homepage layout**: Asymmetric card grids (2-col featured → 4-col compact → 2-col featured). Manual carousels with arrows + dots (no auto-play).
- **Scroll animations**: Viewport-triggered staggered fade-ins via Framer Motion.
- **No hardcoded services**: All service data flows from backend API through React Query. Admin CRUD automatically syncs to the public website.
- **No hardcoded company info**: Company name, logo, address, phone, email, and social links are all fetched from the shared Company Settings API. Fallbacks ensure the site never shows blanks.

## Tech Stack

- React 19 + TypeScript + Vite 5
- TailwindCSS v4 with custom design tokens
- React Router v7 for routing
- TanStack React Query for data fetching/caching + automatic cache invalidation
- React Hook Form + Zod for form validation
- Recharts for dashboard charts
- Framer Motion for hero slider, scroll animations, and carousel transitions
