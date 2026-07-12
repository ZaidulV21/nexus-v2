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
    detail: (id: string) => ['projects', 'detail', id] as const,
    invoices: (id: string) => ['projects', 'invoices', id] as const,
    financialSummary: (id: string) => ['projects', 'financial-summary', id] as const,
    documents: (id: string) => ['projects', 'documents', id] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: (params: unknown) => ['invoices', 'list', params] as const,
    detail: (id: string) => ['invoices', 'detail', id] as const,
  },
  timeline: (entityType: string, entityId: string) => ['timeline', entityType, entityId] as const,
  auditLogs: (entityType: string, entityId: string) => ['audit-logs', entityType, entityId] as const,
};
