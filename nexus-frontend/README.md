# Nexus Frontend — Business Service Management Platform

**Status: All modules fully implemented. Public website redesigned with premium UX, live backend services, and a config-driven Get Quote wizard.**

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
- **Services** (`/admin/services`) — CRUD with image upload, thumbnail list, image replace/remove on detail
- **Quotations** (`/admin/quotations`) — Create (client-only), revise, approve, send, PDF preview/download/regenerate
- **Projects** (`/admin/projects`) — List, detail, aggregate status tracking
- **Invoices** (`/admin/invoices`) — Create, send, cancel, offline payment recording, receipt emails, PDF preview/download/regenerate
- **Payments** (`/admin/payments`) — Payment ledger: search, status filter, pagination, gateway column; rows open the invoice detail
- **Search** (`/admin/search`, Cmd+K) — Global search across 7 modules with type filtering
- **Notifications** (`/admin/notifications`) — In-app notification center with unread badge
- **Settings** (`/admin/settings/company`) — Full settings page with 5 sections, file uploads
- **Documents** (`/admin/documents`) — Upload, list, download

### Client Portal (`/portal/*`)
- **Dashboard** (`/portal/dashboard`) — Personal info, quick stats, recent activity (timeline), notifications, upcoming payments, projects, quotations, invoices, documents, messages
- **Quotation Detail** — PDF as source of truth, Accept/Reject/Revision workflow
- **Invoice Detail** — PDF view, payment summary cards, payment history, **Pay Online** via Razorpay checkout when outstanding balance remains
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
- **Get Quote** (`/get-quote`) — 8-step config-driven wizard with dynamic question engine, file uploads, OTP verification (server-side), account creation with password, existing user detection and login branching, post-login review summary, and lead submission via backend API

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
    components/     - Navbar (dynamic services from API), Footer, ScrollToTop, SectionHeader, PageHero, ServiceCard,
                      FAQAccordion, TestimonialCard, TestimonialsCarousel, motion (FadeIn/StaggerGroup/ScaleIn)
    sections/       - HeroSection (premium slider), ClientLogosSection, ProblemSolutionSection,
                      ServicesSection (live data), ProcessSection, StatsSection, ProjectsSection,
                      IndustriesSection, TestimonialsSection, FAQSection, CTASection
    pages/          - HomePage, ServicesPage (live data), ServiceDetailPage (live data),
                      IndustriesPage, HowItWorksPage, ProjectsPage, AboutPage, ContactPage,
                      ResourcesPage (disabled), GetQuotePage (config-driven wizard)
    layouts/        - PublicLayout
    hooks/          - useScrollSpy, useMobileMenu, usePublicCompany
    types/          - ServiceItem, IndustryItem, ProjectItem, TestimonialItem, FAQItem, NavItem
    constants/      - INDUSTRIES, PROCESS_STEPS, STATS, TESTIMONIALS, FAQS, NAVIGATION
    wizard/         - Config-driven Get Quote wizard engine
      types.ts          - WizardState, WizardFileEntry, WizardContactInfo, QuestionConfig, ServiceQuestionConfig
      serviceQuestions.ts - Service-specific question configurations + getQuestionsForService() lookup
      useWizardState.ts - State hook with localStorage persistence, step navigation, validation
      QuestionRenderer.tsx - Dynamic renderer for text/textarea/number/select/radio/checkbox questions
      WizardProgress.tsx   - Step indicator bar (numbers → checkmarks)
      WizardNavigation.tsx - Back/Next/Submit footer with canProceed gating
      steps/
        index.ts      - Barrel exports for all step components
        StepServices.tsx  - Multi-select service grid (API data, animated checkboxes)
        StepQuestions.tsx - Per-service dynamic questions via QuestionRenderer
        StepUploads.tsx   - Per-service file upload zones with previews
        StepContact.tsx   - Contact form with inline validation (name, email, phone required)
        StepReview.tsx    - Full review of all wizard sections with edit links + icons
        StepAccount.tsx   - Password creation form (email readonly, password + confirm)
        StepLogin.tsx     - Existing user login form with error display and retry
        StepOtp.tsx       - OTP verification screen (real API, 6-digit boxes, countdown)
        StepSubmit.tsx    - Loading spinner during submission
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
| CTA Section | Phone number from settings |

### Graceful Fallback Strategy

- If `companyName` is empty → falls back to "Nexus Managed Services"
- If `logoUrl` is null → shows first letter of company name in a colored square
- If `phone` is empty → Phone row hidden in Footer and Contact page
- If `email` is empty → Email row hidden
- If `address` fields are all empty → Address row hidden, falls back to hardcoded address
- If social links are empty → Social icons section hidden entirely
- Never shows "undefined", "null", or empty strings

## Architecture: Config-Driven Get Quote Wizard

The Get Quote page (`/get-quote`) is an 8-step wizard with a **dynamic question engine** — service-specific questions are defined in configuration, not hardcoded into wizard logic.

### Wizard Flow

The wizard intelligently branches based on whether the user's email already exists in the system:

**New User Flow:**
1. **Step 0 — Services**: Multi-select grid from `usePublicServices()` API
2. **Step 1 — Questions**: Per-service dynamic questions rendered by `QuestionRenderer` based on `serviceQuestions.ts` config. Required fields validated before proceeding.
3. **Step 2 — Files**: Per-service file upload zones with previews (optional)
4. **Step 3 — Contact**: Contact form (name, email, phone, address, preferences) with inline validation. On Next, backend `check-email` API is called to detect existing accounts.
5. **Step 4 — Review**: Full summary of services, answers, files, contact with edit links per section
6. **Step 5 — Account**: Password creation form (email readonly, password + confirm with validation)
7. **Step 6 — OTP**: Email verification via 6-digit code (real API, countdown timer, resend)
8. **Step 7 — Submit**: Loading state → submission → success screen with reference number

**Existing User Flow:**
1. **Steps 0–3**: Same as new user
2. **Step 4 — Review**: Full summary with all details
3. **Step 5 — Login**: Existing account detected → sign in with password. Post-login shows review summary with account email, selected services, enquiry details, and visible "Submit Request" button. "Forgot Password?" links to the reset flow (wizard state preserved in localStorage).
4. **Step 6 — Skipped**: Existing users bypass OTP verification
5. **Step 7 — Submit**: Lead submitted without password (account already exists). Never auto-submits — user always clicks Submit explicitly.

### Key Design Decisions

- **Config-driven**: Adding a new service = adding an entry to `SERVICE_QUESTION_CONFIGS` array in `serviceQuestions.ts`. No wizard logic changes needed.
- **localStorage persistence**: Wizard state survives page refreshes (files excluded). Users can close and return. `emailExists` flag is persisted so the wizard remembers the branch after navigation.
- **Email-based branching**: After the Contact step, `POST /api/public/check-email` determines if the email belongs to an existing client. The wizard dynamically shows Account creation or Login form.
- **Post-login review**: After existing user login, a summary screen shows account email, services, enquiry details, and a clear "Submit Request" button — never auto-submits.
- **Step validation**: Each step has a `canProceed` check. Required questions (marked with `required: true` in config) are validated before the Next button enables. Contact step shows inline validation errors.
- **Progress tracking**: `completedSteps` Set tracks which sections have data, shown as checkmarks in the progress bar. Step labels update dynamically (Account vs Login vs Review & Submit).
- **Real OTP verification**: 6-digit code sent via backend API, verified server-side with bcrypt, 60s resend countdown, auto-focus/auto-advance input boxes. Only for new accounts.
- **Existing user login**: Uses AuthContext's `login()` to store JWT token. Lead is submitted without `password` field, so no duplicate account is created.
- **Lead submission**: Maps wizard state to `CreateLeadInput`. For new users includes `password` (creates Client account). For existing users omits `password` (Lead only).
- **Forgot password integration**: StepLogin links to `/forgot-password?return-to=get-quote`. After password reset, user is redirected back to `/get-quote?returned=true` and can log in with the new password. Wizard state is preserved throughout.

### How to Add Questions for a New Service

Add an entry to `SERVICE_QUESTION_CONFIGS` in `src/public-site/wizard/serviceQuestions.ts`:

```ts
{
  serviceId: 'cm123...',        // Backend service ID
  serviceName: 'New Service',   // Displayed as section header
  questions: [
    {
      id: 'scope',
      type: 'select',
      label: 'Project Scope',
      options: [
        { label: 'Small (under 500 sq ft)', value: 'small' },
        { label: 'Medium (500-2000 sq ft)', value: 'medium' },
      ],
      required: true,
    },
    {
      id: 'notes',
      type: 'textarea',
      label: 'Additional Notes',
      placeholder: 'Tell us more...',
    },
  ],
}
```

If no config entry exists for a service, a generic "Describe your requirements" textarea is shown.

### Question Types

| Type | Rendered As | Stored As |
|------|-------------|-----------|
| `text` | Text input | `string` |
| `textarea` | Multiline text | `string` |
| `number` | Number input | `string` |
| `select` | Dropdown | `string` (option value) |
| `radio` | Radio button group | `string` (option value) |
| `checkbox` | Checkbox group (`multi: true`) | `string[]` (array of values) |

## Design decisions

- **Accent color** "Nexus Indigo" (`#4553FF`) — technical/trustworthy without generic AI defaults.
- **Typography pairing** (Inter + JetBrains Mono for numeric data) follows Linear/Vercel/Stripe conventions.
- **Signature motif**: thin node-and-thread connector line grounded in what the product does.
- **Hero slider**: Premium full-width slider with manual navigation (arrows + dots), auto-rotate every 7s, pause on hover, touch swipe, AnimatePresence fade+slide transitions.
- **Homepage layout**: Asymmetric card grids (2-col featured → 4-col compact → 2-col featured). Manual carousels with arrows + dots (no auto-play).
- **Scroll restoration**: Centralized `ScrollToTop` component in `PublicLayout` ensures all public page navigations start at the top of the page. Handles Link clicks, browser history, and all internal navigation.
- **Scroll animations**: Viewport-triggered staggered fade-ins via Framer Motion.
- **No hardcoded services**: All service data flows from backend API through React Query. Admin CRUD automatically syncs to the public website.
- **No hardcoded company info**: Company name, logo, address, phone, email, and social links are all fetched from the shared Company Settings API. Fallbacks ensure the site never shows blanks.
- **Config-driven wizard**: Service-specific quote questions are defined in config arrays, not hardcoded wizard logic. Adding a service's questions = adding one config entry.
- **Post-login review**: After existing user authentication, a summary screen shows exactly what will be submitted with a visible Submit button — never auto-submits.
- **Forgot password from wizard**: Password reset returns the user to the wizard with all data preserved. The flow adapts based on `?returnTo=get-quote` URL parameter.

## Tech Stack

- React 19 + TypeScript + Vite 5
- TailwindCSS v4 with custom design tokens
- React Router v7 for routing
- TanStack React Query for data fetching/caching + automatic cache invalidation
- React Hook Form + Zod for form validation
- Recharts for dashboard charts
- Framer Motion for hero slider, scroll animations, and carousel transitions
