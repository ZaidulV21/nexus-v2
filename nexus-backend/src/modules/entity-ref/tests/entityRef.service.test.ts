jest.mock('../../../config/database', () => ({
  prisma: {
    lead: { findMany: jest.fn() },
    client: { findMany: jest.fn() },
    quotation: { findMany: jest.fn() },
    project: { findMany: jest.fn() },
    invoice: { findMany: jest.fn() },
    leadService: { findMany: jest.fn() },
    projectService: { findMany: jest.fn() },
    service: { findMany: jest.fn() },
    conversation: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../config/database';
import { enrichWithRefs } from '../entityRef.service';

beforeEach(() => {
  jest.clearAllMocks();
  // Default: every lookup resolves nothing.
  for (const model of Object.values(prisma) as any[]) {
    if (model.findMany) (model.findMany as jest.Mock).mockResolvedValue([]);
  }
});

describe('enrichWithRefs', () => {
  it('replaces entity UUIDs with business references and resolves actors', async () => {
    (prisma.lead.findMany as jest.Mock).mockResolvedValue([
      { id: 'lead-uuid', leadNumber: 'L-00007', contactName: 'Asha' },
    ]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'admin-uuid', email: 'admin@nexus.io' }]);
    (prisma.client.findMany as jest.Mock).mockResolvedValue([]);

    const rows = [
      { entityType: 'LEAD', entityId: 'lead-uuid', actorUserId: 'admin-uuid', description: 'x' },
    ];
    const enriched = await enrichWithRefs(rows);

    expect(enriched[0].entityRef).toEqual({ label: 'L-00007', name: 'Asha' });
    expect(enriched[0].actorRef).toBe('admin@nexus.io');
  });

  it('resolves Client actors (portal actions) to clientNumber + name', async () => {
    (prisma.quotation.findMany as jest.Mock).mockResolvedValue([
      { id: 'quo-uuid', quotationNumber: 'Q-00003' },
    ]);
    (prisma.client.findMany as jest.Mock).mockImplementation(async (args: any) => {
      // Called for both entity refs (none here) and actor refs.
      if (args.select?.clientNumber && args.select?.contactName && !args.select?.companyName) {
        return [{ id: 'client-uuid', clientNumber: 'C-00002', contactName: 'Ravi' }];
      }
      return [];
    });

    const enriched = await enrichWithRefs([
      { entityType: 'QUOTATION', entityId: 'quo-uuid', actorUserId: 'client-uuid' },
    ]);

    expect(enriched[0].entityRef).toEqual({ label: 'Q-00003' });
    expect(enriched[0].actorRef).toBe('C-00002 — Ravi');
  });

  it('returns null refs for unknown entities instead of leaking the UUID', async () => {
    const enriched = await enrichWithRefs([
      { entityType: 'LEAD', entityId: 'deleted-lead-uuid', actorUserId: null },
    ]);

    expect(enriched[0].entityRef).toBeNull();
    expect(enriched[0].actorRef).toBeNull();
  });

  it('batches lookups: one query per entity type regardless of row count', async () => {
    (prisma.lead.findMany as jest.Mock).mockResolvedValue([
      { id: 'l1', leadNumber: 'L-00001', contactName: 'A' },
      { id: 'l2', leadNumber: 'L-00002', contactName: 'B' },
    ]);

    await enrichWithRefs([
      { entityType: 'LEAD', entityId: 'l1' },
      { entityType: 'LEAD', entityId: 'l2' },
      { entityType: 'LEAD', entityId: 'l1' },
    ]);

    expect(prisma.lead.findMany).toHaveBeenCalledTimes(1);
    const where = (prisma.lead.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.id.in.sort()).toEqual(['l1', 'l2']);
  });
});
