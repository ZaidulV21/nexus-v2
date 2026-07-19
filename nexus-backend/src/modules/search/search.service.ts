import { prisma } from '../../config/database';
import { ValidationError } from '../../core/errors/AppError';
import { SearchResults } from './search.types';

const MIN_QUERY_LENGTH = 2;

// Deliberately does not implement its own queries - fans out to a simple
// contains-filter against each entity's already-indexed searchable fields.
// If this needs to scale further, this is the single seam to replace with
// Postgres full-text search or an external index, with zero change to any
// calling module.
export const searchService = {
  async search(query: string): Promise<SearchResults> {
    if (!query || query.trim().length < MIN_QUERY_LENGTH) {
      throw new ValidationError(`Search query must be at least ${MIN_QUERY_LENGTH} characters`);
    }
    const q = query.trim();
    const insensitive = { contains: q, mode: 'insensitive' as const };

    const [leads, clients, projects, quotations, invoices, services, documents] = await Promise.all([
      prisma.lead.findMany({
        where: {
          deletedAt: null,
          OR: [
            { leadNumber: insensitive },
            { contactName: insensitive },
            { phone: insensitive },
            { email: insensitive },
            { companyName: insensitive },
          ],
        },
        take: 20,
      }),
      prisma.client.findMany({
        where: {
          deletedAt: null,
          OR: [
            { clientNumber: insensitive },
            { companyName: insensitive },
            { contactName: insensitive },
            { email: insensitive },
            { phone: insensitive },
          ],
        },
        take: 20,
      }),
      prisma.project.findMany({
        where: { deletedAt: null, projectNumber: insensitive },
        take: 20,
      }),
      prisma.quotation.findMany({
        where: { quotationNumber: insensitive },
        take: 20,
      }),
      prisma.invoice.findMany({
        where: { invoiceNumber: insensitive },
        take: 20,
      }),
      prisma.service.findMany({
        where: { name: insensitive },
        take: 20,
      }),
      prisma.document.findMany({
        where: { deletedAt: null, fileName: insensitive },
        take: 20,
      }),
    ]);

    return { leads, clients, projects, quotations, invoices, services, documents };
  },
};
