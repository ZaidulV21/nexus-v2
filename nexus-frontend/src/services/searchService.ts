import { api } from '@/lib/api';
import type { Client, Invoice, Lead, NexusDocument, Project, Quotation, Service } from '@/types';

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
  search: (q: string) => api.get<SearchResults>('/search', { q }),
};
