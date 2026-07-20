export type SearchEntityType = 'leads' | 'clients' | 'projects' | 'quotations' | 'invoices' | 'services' | 'documents';

export const SEARCH_ENTITY_TYPES: SearchEntityType[] = ['leads', 'clients', 'projects', 'quotations', 'invoices', 'services', 'documents'];

export interface SearchResults {
  leads: unknown[];
  clients: unknown[];
  projects: unknown[];
  quotations: unknown[];
  invoices: unknown[];
  services: unknown[];
  documents: unknown[];
}
