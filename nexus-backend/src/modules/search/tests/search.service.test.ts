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

import { searchService } from '../search.service';

describe('searchService.search', () => {
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
});
