import { prisma } from '../../config/database';
import { ValidationError } from '../../core/errors/AppError';
import { SearchResults, SearchEntityType, SEARCH_ENTITY_TYPES } from './search.types';

const MIN_QUERY_LENGTH = 2;
const RESULTS_PER_TYPE = 15;

// Fans out a case-insensitive contains-filter against each entity's
// searchable fields, including related entity names (client, service,
// category) so the user can search by any dimension. When a `type`
// filter is provided only that entity type is queried, avoiding
// unnecessary database work.
export const searchService = {
  async search(query: string, type?: SearchEntityType): Promise<SearchResults> {
    if (!query || query.trim().length < MIN_QUERY_LENGTH) {
      throw new ValidationError(`Search query must be at least ${MIN_QUERY_LENGTH} characters`);
    }
    const q = query.trim();
    const insensitive = { contains: q, mode: 'insensitive' as const };
    const take = RESULTS_PER_TYPE;

    const typesToQuery = type ? [type] : SEARCH_ENTITY_TYPES;

    const queryMap: Record<SearchEntityType, () => Promise<unknown[]>> = {
      leads: () =>
        prisma.lead.findMany({
          where: {
            deletedAt: null,
            archivedAt: null,
            OR: [
              { leadNumber: insensitive },
              { contactName: insensitive },
              { phone: insensitive },
              { email: insensitive },
              { companyName: insensitive },
            ],
          },
          take,
        }),

      clients: () =>
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
          take,
        }),

      projects: () =>
        prisma.project.findMany({
          where: {
            deletedAt: null,
            OR: [
              { projectNumber: insensitive },
              { client: { contactName: insensitive } },
              { client: { companyName: insensitive } },
              { projectServices: { some: { service: { name: insensitive } } } },
            ],
          },
          include: {
            client: { select: { id: true, contactName: true, companyName: true } },
          },
          take,
        }),

      quotations: () =>
        prisma.quotation.findMany({
          where: {
            OR: [
              { quotationNumber: insensitive },
              { client: { contactName: insensitive } },
              { client: { companyName: insensitive } },
              { versions: { some: { items: { some: { description: insensitive } } } } },
            ],
          },
          include: {
            client: { select: { id: true, contactName: true, companyName: true } },
          },
          take,
        }),

      invoices: () =>
        prisma.invoice.findMany({
          where: {
            OR: [
              { invoiceNumber: insensitive },
              { label: insensitive },
              { client: { contactName: insensitive } },
              { client: { companyName: insensitive } },
              { project: { projectNumber: insensitive } },
            ],
          },
          include: {
            client: { select: { id: true, contactName: true, companyName: true } },
            project: { select: { id: true, projectNumber: true } },
          },
          take,
        }),

      services: () =>
        prisma.service.findMany({
          where: {
            OR: [
              { name: insensitive },
              { description: insensitive },
              { category: { name: insensitive } },
            ],
          },
          include: {
            category: { select: { id: true, name: true } },
          },
          take,
        }),

      documents: () =>
        prisma.document.findMany({
          where: {
            deletedAt: null,
            OR: [
              { fileName: insensitive },
              { documentType: insensitive },
              { client: { contactName: insensitive } },
              { client: { companyName: insensitive } },
              { projectRef: { projectNumber: insensitive } },
            ],
          },
          include: {
            client: { select: { id: true, contactName: true, companyName: true } },
            projectRef: { select: { id: true, projectNumber: true } },
          },
          take,
        }),
    };

    const entries = await Promise.all(
      typesToQuery.map(async (t) => [t, await queryMap[t]()] as const)
    );

    const results: SearchResults = {
      leads: [],
      clients: [],
      projects: [],
      quotations: [],
      invoices: [],
      services: [],
      documents: [],
    };

    for (const [key, data] of entries) {
      (results as any)[key] = data;
    }

    return results;
  },
};
