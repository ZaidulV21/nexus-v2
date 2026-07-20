jest.mock('../../../config/database', () => ({
  prisma: {
    lead: { findMany: jest.fn().mockResolvedValue([]) },
    client: { findMany: jest.fn().mockResolvedValue([]) },
    project: { findMany: jest.fn().mockResolvedValue([]) },
    quotation: { findMany: jest.fn().mockResolvedValue([]) },
    invoice: { findMany: jest.fn().mockResolvedValue([]) },
    service: { findMany: jest.fn().mockResolvedValue([]) },
    document: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

import { prisma } from '../../../config/database';
import { searchService } from '../search.service';

const mockPrisma = prisma as any;

describe('searchService.search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a query shorter than the minimum length', async () => {
    await expect(searchService.search('a')).rejects.toThrow('at least 2 characters');
  });

  it('rejects an empty query', async () => {
    await expect(searchService.search('')).rejects.toThrow();
  });

  it('returns a results object grouped by entity type for a valid query', async () => {
    const results = await searchService.search('9999999999');
    expect(results).toHaveProperty('leads');
    expect(results).toHaveProperty('clients');
    expect(results).toHaveProperty('projects');
    expect(results).toHaveProperty('quotations');
    expect(results).toHaveProperty('invoices');
    expect(results).toHaveProperty('services');
    expect(results).toHaveProperty('documents');
  });

  it('queries all 7 entity types when no type filter is provided', async () => {
    await searchService.search('test');
    expect(mockPrisma.lead.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.client.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.project.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.quotation.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.service.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.document.findMany).toHaveBeenCalledTimes(1);
  });

  it('queries only the specified type when type filter is provided', async () => {
    await searchService.search('test', 'leads');
    expect(mockPrisma.lead.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.client.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.project.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.quotation.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.invoice.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.service.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.document.findMany).not.toHaveBeenCalled();
  });

  it('queries only clients when type filter is clients', async () => {
    await searchService.search('acme', 'clients');
    expect(mockPrisma.client.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.lead.findMany).not.toHaveBeenCalled();
  });

  it('excludes archived leads from results', async () => {
    await searchService.search('test', 'leads');
    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archivedAt: null }),
      })
    );
  });

  it('includes related entity data for projects', async () => {
    await searchService.search('test', 'projects');
    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          client: expect.any(Object),
        }),
      })
    );
  });

  it('includes related entity data for services with category', async () => {
    await searchService.search('test', 'services');
    expect(mockPrisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          category: expect.any(Object),
        }),
      })
    );
  });

  it('trims whitespace from the query', async () => {
    await searchService.search('  hello  ');
    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ leadNumber: expect.objectContaining({ contains: 'hello' }) }),
          ]),
        }),
      })
    );
  });
});
