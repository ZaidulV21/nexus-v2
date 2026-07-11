jest.mock('../../../core/utils/transaction', () => ({
  runInTransaction: jest.fn((fn) => fn({})),
}));
jest.mock('../lead.repository', () => ({
  leadRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    generateLeadNumber: jest.fn().mockResolvedValue('L-00001'),
  },
  leadServiceRepository: {
    createMany: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    listForLead: jest.fn(),
  },
  leadActivityNoteRepository: {
    create: jest.fn(),
    listForLead: jest.fn(),
  },
}));
jest.mock('../../catalog/service.repository', () => ({
  serviceRepository: {
    findById: jest.fn(),
    getActiveQuestionnaire: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('../../timeline/timeline.service', () => ({
  timelineService: { recordEvent: jest.fn() },
}));
jest.mock('../../audit/audit.service', () => ({
  auditService: { recordAudit: jest.fn() },
}));
jest.mock('../../notifications/notifications.service', () => ({
  notificationsService: { emitEvent: jest.fn() },
}));

import { leadRepository, leadServiceRepository } from '../lead.repository';
import { serviceRepository } from '../../catalog/service.repository';
import { leadService } from '../lead.service';

describe('leadService.createLead', () => {
  it('creates one Lead with multiple Lead Services for a multi-service enquiry', async () => {
    (leadRepository.create as jest.Mock).mockResolvedValue({
      id: 'lead1',
      leadNumber: 'L-00001',
      email: 'john@example.com',
    });
    (serviceRepository.findById as jest.Mock).mockImplementation((id: string) =>
      Promise.resolve({ id, isActive: true, name: 'Some Service' })
    );
    (leadServiceRepository.createMany as jest.Mock).mockResolvedValue([
      { id: 'ls1', serviceId: 'svc-interior' },
      { id: 'ls2', serviceId: 'svc-solar' },
      { id: 'ls3', serviceId: 'svc-cctv' },
    ]);

    const result = await leadService.createLead({
      contactName: 'John Doe',
      phone: '9999999999',
      email: 'john@example.com',
      services: [{ serviceId: 'svc-interior' }, { serviceId: 'svc-solar' }, { serviceId: 'svc-cctv' }],
    });

    expect(result.lead.id).toBe('lead1');
    expect(result.leadServices).toHaveLength(3);
    expect(leadServiceRepository.createMany).toHaveBeenCalledWith(
      'lead1',
      expect.arrayContaining([expect.objectContaining({ serviceId: 'svc-interior' })]),
      {}
    );
  });

  it('rejects the whole submission if one requested service is inactive', async () => {
    (leadRepository.create as jest.Mock).mockResolvedValue({ id: 'lead1', leadNumber: 'L-00001' });
    (serviceRepository.findById as jest.Mock).mockImplementation((id: string) =>
      Promise.resolve(id === 'svc-bad' ? { id, isActive: false } : { id, isActive: true })
    );

    await expect(
      leadService.createLead({
        contactName: 'Jane Doe',
        phone: '8888888888',
        services: [{ serviceId: 'svc-good' }, { serviceId: 'svc-bad' }],
      })
    ).rejects.toThrow('is not available');
  });
});

describe('leadService.addServiceToLead', () => {
  it('rejects adding a service to an already-converted lead', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      convertedAt: new Date(),
    });
    await expect(
      leadService.addServiceToLead('lead1', { serviceId: 'svc-1' })
    ).rejects.toThrow('already converted');
  });
});
