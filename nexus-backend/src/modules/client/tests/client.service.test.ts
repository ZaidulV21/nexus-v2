jest.mock('../../../core/utils/transaction', () => ({
  runInTransaction: jest.fn((fn) => fn({})),
}));
jest.mock('../client.repository', () => ({
  clientRepository: {
    create: jest.fn(),
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
jest.mock('../../timeline/timeline.service', () => ({ timelineService: { recordEvent: jest.fn() } }));
jest.mock('../../audit/audit.service', () => ({ auditService: { recordAudit: jest.fn() } }));
jest.mock('../../notifications/notifications.service', () => ({ notificationsService: { emitEvent: jest.fn() } }));

import { clientRepository } from '../client.repository';
import { leadRepository, leadServiceRepository } from '../../lead/lead.repository';
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
      email: 'john@example.com',
      contactName: 'John',
      phone: '999',
      companyName: null,
    });
    (clientRepository.findBySourceLeadId as jest.Mock).mockResolvedValue(null);
    (clientRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([{ status: 'APPROVED' }]);
    (clientRepository.create as jest.Mock).mockResolvedValue({
      id: 'client1',
      email: 'john@example.com',
      contactName: 'John',
    });

    const result = await clientService.convertLeadToClient('lead1', 'admin1');
    expect(result.id).toBe('client1');
    expect(leadRepository.markConverted).toHaveBeenCalledWith('lead1', {});
  });
});
