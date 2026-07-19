jest.mock('../../../core/utils/transaction', () => ({
  runInTransaction: jest.fn((fn) => fn({})),
}));
jest.mock('../client.repository', () => ({
  clientRepository: {
    create: jest.fn(),
    generateClientNumber: jest.fn(),
    findBySourceLeadId: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
  },
}));
jest.mock('../../lead/lead.repository', () => ({
  leadRepository: { findById: jest.fn(), markConverted: jest.fn() },
  leadServiceRepository: { listForLead: jest.fn() },
}));
jest.mock('../../quotation/quotation.repository', () => ({
  quotationRepository: { migrateLeadQuotationsToClient: jest.fn().mockResolvedValue({ count: 0 }) },
}));
jest.mock('../../timeline/timeline.service', () => ({ timelineService: { recordEvent: jest.fn() } }));
jest.mock('../../audit/audit.service', () => ({ auditService: { recordAudit: jest.fn() } }));
jest.mock('../../notifications/notifications.service', () => ({ notificationsService: { emitEvent: jest.fn() } }));

import { clientRepository } from '../client.repository';
import { leadRepository, leadServiceRepository } from '../../lead/lead.repository';
import { quotationRepository } from '../../quotation/quotation.repository';
import { clientService } from '../client.service';

describe('clientService.convertLeadToClient', () => {
  it('rejects converting a Lead that has no approved services', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({ id: 'lead1', email: 'x@y.com' });
    (clientRepository.findBySourceLeadId as jest.Mock).mockResolvedValue(null);
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([{ status: 'NEW' }]);

    await expect(clientService.convertLeadToClient('lead1')).rejects.toThrow(
      'must have at least one approved service'
    );
  });

  it('rejects converting an already-converted Lead', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({ id: 'lead1' });
    (clientRepository.findBySourceLeadId as jest.Mock).mockResolvedValue({ id: 'existing-client' });

    await expect(clientService.convertLeadToClient('lead1')).rejects.toThrow('already been converted');
  });

  it('rejects converting a Lead when the email already belongs to another client', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      email: 'john@example.com',
      contactName: 'John',
      phone: '999',
      companyName: null,
    });
    (clientRepository.findBySourceLeadId as jest.Mock).mockResolvedValue(null);
    (clientRepository.findByEmail as jest.Mock).mockResolvedValue({ id: 'existing-client' });
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([{ status: 'APPROVED' }]);

    await expect(clientService.convertLeadToClient('lead1', 'admin1')).rejects.toThrow(
      'already exists for this email address'
    );
  });

  it('converts a Lead with an approved service and creates a Client', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      leadNumber: 'L-00001',
      email: 'john@example.com',
      contactName: 'John',
      phone: '999',
      companyName: null,
    });
    (clientRepository.findBySourceLeadId as jest.Mock).mockResolvedValue(null);
    (clientRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([{ status: 'APPROVED' }]);
    (clientRepository.generateClientNumber as jest.Mock).mockResolvedValue('C-00001');
    (quotationRepository.migrateLeadQuotationsToClient as jest.Mock).mockResolvedValue({ count: 2 });
    (clientRepository.create as jest.Mock).mockResolvedValue({
      id: 'client1',
      clientNumber: 'C-00001',
      email: 'john@example.com',
      contactName: 'John',
    });

    const result = await clientService.convertLeadToClient('lead1', 'admin1');
    expect(result.id).toBe('client1');
    expect(clientRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ clientNumber: 'C-00001' }),
      {}
    );
    expect(leadRepository.markConverted).toHaveBeenCalledWith('lead1', {});
    expect(quotationRepository.migrateLeadQuotationsToClient).toHaveBeenCalledWith('lead1', 'client1', {});

    // The migration is recorded in both the Timeline and the Audit Log,
    // referencing business IDs and the migrated count.
    const { timelineService } = jest.requireMock('../../timeline/timeline.service');
    const { auditService } = jest.requireMock('../../audit/audit.service');
    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'QUOTATIONS_MIGRATED',
        description: expect.stringContaining('2 quotation(s) migrated from Lead L-00001 to Client C-00001'),
      })
    );
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'QUOTATIONS_MIGRATED',
        afterState: expect.objectContaining({ migratedQuotations: 2 }),
      })
    );
  });
});
