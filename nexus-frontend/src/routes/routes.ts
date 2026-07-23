// Single source of truth for route paths. Every Link/navigate() call and
// the CommandPalette's nav list should import from here rather than
// hardcoding path strings, so renaming a route only ever touches one file.
//
// Architecture:
//   /              → Public Marketing Website (no auth required)
//   /admin/*       → Admin CRM (requires ADMIN authentication)
//   /portal/*      → Client Portal (requires CLIENT authentication)
//   /login         → Shared login page (no auth required)

export const ROUTES = {
  // ── Public Marketing Website ───────────────────────────────────────
  public: {
    home: '/',
    services: '/services',
    serviceDetail: (slug: string) => `/services/${slug}` as string,
    industries: '/industries',
    howItWorks: '/how-it-works',
    projects: '/projects',
    about: '/about',
    resources: '/resources',
    contact: '/contact',
    getQuote: '/get-quote',
  },

  // ── Admin CRM (all under /admin) ──────────────────────────────────
  admin: {
    dashboard: '/admin',
    leads: '/admin/leads',
    leadDetail: (id: string) => `/admin/leads/${id}` as string,
    clients: '/admin/clients',
    clientDetail: (id: string) => `/admin/clients/${id}` as string,
    quotations: '/admin/quotations',
    quotationDetail: (id: string) => `/admin/quotations/${id}` as string,
    services: '/admin/services',
    serviceDetail: (id: string) => `/admin/services/${id}` as string,
    projects: '/admin/projects',
    projectDetail: (id: string) => `/admin/projects/${id}` as string,
    invoices: '/admin/invoices',
    invoiceDetail: (id: string) => `/admin/invoices/${id}` as string,
    messages: '/admin/messages',
    documents: '/admin/documents',
    notifications: '/admin/notifications',
    timeline: '/admin/timeline',
    auditLogs: '/admin/audit-logs',
    search: '/admin/search',
    settings: '/admin/settings',
    companySettings: '/admin/settings/company',
    designSystem: '/admin/design-system',
  },

  // ── Client Portal (all under /portal) ─────────────────────────────
  portal: {
    dashboard: '/portal',
    quotations: '/portal/quotations',
    quotationDetail: (id: string) => `/portal/quotations/${id}` as string,
    projects: '/portal/projects',
    projectDetail: (id: string) => `/portal/projects/${id}` as string,
    invoices: '/portal/invoices',
    invoiceDetail: (id: string) => `/portal/invoices/${id}` as string,
    messages: '/portal/messages',
    documents: '/portal/documents',
    notifications: '/portal/notifications',
  },

  // ── Auth ───────────────────────────────────────────────────────────
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
} as const;
