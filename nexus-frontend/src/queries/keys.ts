// Centralized React Query key factories. Every module's query hooks should
// build keys from here rather than inlining array literals, so invalidation
// after a mutation can never typo a key and silently miss a refetch.
export const queryKeys = {
  leads: {
    all: ['leads'] as const,
    list: (params: unknown) => ['leads', 'list', params] as const,
    detail: (id: string) => ['leads', 'detail', id] as const,
    notes: (id: string) => ['leads', 'notes', id] as const,
  },
  clients: {
    all: ['clients'] as const,
    list: (params: unknown) => ['clients', 'list', params] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
  },
  services: {
    all: ['services'] as const,
    list: (params: unknown) => ['services', 'list', params] as const,
    publicList: ['services', 'public-list'] as const,
    detail: (id: string) => ['services', 'detail', id] as const,
    categories: ['services', 'categories'] as const,
  },
  quotations: {
    all: ['quotations'] as const,
    list: (params: unknown) => ['quotations', 'list', params] as const,
    clientList: (clientId: string, params: unknown) => ['quotations', 'client-list', clientId, params] as const,
    detail: (id: string) => ['quotations', 'detail', id] as const,
    clientDetail: (id: string) => ['quotations', 'client-detail', id] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: (params: unknown) => ['projects', 'list', params] as const,
    clientList: ['projects', 'client-list'] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    clientDetail: (id: string) => ['projects', 'client-detail', id] as const,
    invoices: (id: string) => ['projects', 'invoices', id] as const,
    financialSummary: (id: string) => ['projects', 'financial-summary', id] as const,
    documents: (id: string) => ['projects', 'documents', id] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: (params: unknown) => ['invoices', 'list', params] as const,
    clientList: ['invoices', 'client-list'] as const,
    detail: (id: string) => ['invoices', 'detail', id] as const,
    clientDetail: (id: string) => ['invoices', 'client-detail', id] as const,
  },
  documents: {
    all: ['documents'] as const,
    clientList: ['documents', 'client-list'] as const,
    adminList: (params: unknown) => ['documents', 'admin-list', params] as const,
  },
  messages: {
    all: ['messages'] as const,
    conversations: ['messages', 'conversations'] as const,
    thread: (clientId: string) => ['messages', 'thread', clientId] as const,
  },
  dashboard: {
    adminSummary: ['dashboard', 'admin-summary'] as const,
    clientSummary: ['dashboard', 'client-summary'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (page: number, pageSize: number, isRead?: boolean) =>
      isRead !== undefined ? ['notifications', 'list', page, pageSize, isRead] as const : ['notifications', 'list', page, pageSize] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  company: {
    all: ['company'] as const,
    detail: ['company', 'detail'] as const,
  },
  globalTimeline: (params: unknown) => ['timeline', 'global', params] as const,
  globalAuditLogs: (params: unknown) => ['audit-logs', 'global', params] as const,
  search: (q: string, type?: string) => type ? ['search', q, type] as const : ['search', q] as const,
  timeline: (entityType: string, entityId: string) => ['timeline', entityType, entityId] as const,
  auditLogs: (entityType: string, entityId: string) => ['audit-logs', entityType, entityId] as const,
};
