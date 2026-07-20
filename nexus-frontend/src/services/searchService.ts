import { api } from '@/lib/api';
import type { Client, Invoice, Lead, NexusDocument, Project, Quotation, Service } from '@/types';

export type SearchEntityType = 'leads' | 'clients' | 'projects' | 'quotations' | 'invoices' | 'services' | 'documents';

export const SEARCH_ENTITY_TYPES: SearchEntityType[] = ['leads', 'clients', 'projects', 'quotations', 'invoices', 'services', 'documents'];

export interface SearchResults {
  leads: Lead[];
  clients: Client[];
  projects: Project[];
  quotations: Quotation[];
  invoices: Invoice[];
  services: Service[];
  documents: NexusDocument[];
}

export const searchService = {
  search: (q: string, type?: SearchEntityType) =>
    api.get<SearchResults>('/search', { q, ...(type ? { type } : {}) }),
};
