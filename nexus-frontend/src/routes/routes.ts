// Single source of truth for route paths. Every Link/navigate() call and
// the CommandPalette's nav list should import from here rather than
// hardcoding path strings, so renaming a route only ever touches one file.
export const ROUTES = {
  dashboard: '/',
  leads: '/leads',
  leadDetail: (id: string) => `/leads/${id}`,
  clients: '/clients',
  clientDetail: (id: string) => `/clients/${id}`,
  quotations: '/quotations',
  quotationDetail: (id: string) => `/quotations/${id}`,
  projects: '/projects',
  projectDetail: (id: string) => `/projects/${id}`,
  invoices: '/invoices',
  invoiceDetail: (id: string) => `/invoices/${id}`,
  messages: '/messages',
  documents: '/documents',
  timeline: '/timeline',
  auditLogs: '/audit-logs',
  search: '/search',
  settings: '/settings',
  designSystem: '/design-system',

  // Client portal (separate shell/auth context from the Admin app)
  portal: {
    dashboard: '/portal',
    quotations: '/portal/quotations',
    quotationDetail: (id: string) => `/portal/quotations/${id}`,
    projects: '/portal/projects',
    projectDetail: (id: string) => `/portal/projects/${id}`,
    invoices: '/portal/invoices',
    invoiceDetail: (id: string) => `/portal/invoices/${id}`,
    messages: '/portal/messages',
    documents: '/portal/documents',
  },

  login: '/login',
} as const;
