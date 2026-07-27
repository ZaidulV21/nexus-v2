jest.mock('../../../core/utils/transaction', () => ({
  runInTransaction: jest.fn((fn) => fn({})),
}));
jest.mock('../../catalog/service.repository', () => ({
  serviceRepository: {
    findById: jest.fn(),
    getActiveQuestionnaire: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('../../client/client.repository', () => ({
  clientRepository: {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    generateClientNumber: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('../lead.repository', () => ({
  leadRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
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
jest.mock('../../timeline/timeline.service', () => ({
  timelineService: { recordEvent: jest.fn() },
}));
jest.mock('../../audit/audit.service', () => ({
  auditService: { recordAudit: jest.fn() },
}));
jest.mock('../../notifications/notifications.service', () => ({
  notificationsService: { emitEvent: jest.fn() },
}));
jest.mock('../../status-engine/statusEngine.service', () => ({
  statusEngineService: { transition: jest.fn() },
}));
jest.mock('../../otp/otp.service', () => ({
  otpService: { isEmailVerified: jest.fn().mockResolvedValue(true) },
}));

import { leadRepository, leadServiceRepository } from '../lead.repository';
import { clientRepository } from '../../client/client.repository';
import { serviceRepository } from '../../catalog/service.repository';
import { statusEngineService } from '../../status-engine/statusEngine.service';
import { ValidationError } from '../../../core/errors/AppError';
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

describe('leadService.updateLeadServiceStatus - per-service independence after conversion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows manual status updates on remaining services after Lead conversion', async () => {
    // Interior Design was converted but Solar is still editable
    (leadServiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'ls-solar',
      leadId: 'lead1',
      status: 'NEW',
    });

    await leadService.updateLeadServiceStatus('ls-solar', { toStatus: 'CONTACTED' }, 'admin1');

    expect(statusEngineService.transition).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'ls-solar', toStatus: 'CONTACTED' })
    );
  });

  it('rejects manual updates to a service already handed off to a Project', async () => {
    (leadServiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'ls-interior',
      leadId: 'lead1',
      status: 'PROJECT CREATED',
    });

    await expect(
      leadService.updateLeadServiceStatus('ls-interior', { toStatus: 'APPROVED' }, 'admin1')
    ).rejects.toThrow('Project Service instead');
    expect(statusEngineService.transition).not.toHaveBeenCalled();
  });

  it('still allows manual updates on an unconverted Lead', async () => {
    (leadServiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'ls1',
      leadId: 'lead1',
      status: 'NEW',
    });

    await leadService.updateLeadServiceStatus('ls1', { toStatus: 'CONTACTED' }, 'admin1');

    expect(statusEngineService.transition).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'ls1', toStatus: 'CONTACTED' })
    );
  });
});

describe('leadService.applyQuotationWorkflowStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('transitions only the quoted services, as automatic, skipping ones already at the target', async () => {
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([
      { id: 'ls1', serviceId: 'svc1', status: 'QUOTE PREPARING' },
      { id: 'ls2', serviceId: 'svc2', status: 'QUOTE SENT' }, // already there - skipped
      { id: 'ls3', serviceId: 'svc3', status: 'NEW' }, // not quoted - untouched
    ]);

    await leadService.applyQuotationWorkflowStatus('lead1', ['svc1', 'svc2'], 'QUOTE SENT', 'admin1');

    expect(statusEngineService.transition).toHaveBeenCalledTimes(1);
    expect(statusEngineService.transition).toHaveBeenCalledWith({
      entityType: 'LEAD_SERVICE',
      entityId: 'ls1',
      fromStatus: 'QUOTE PREPARING',
      toStatus: 'QUOTE SENT',
      actorUserId: 'admin1',
      isAutomatic: true,
    });
  });

  it('swallows ValidationErrors so the triggering workflow event never fails', async () => {
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([
      { id: 'ls1', serviceId: 'svc1', status: 'PROJECT CREATED' },
    ]);
    (statusEngineService.transition as jest.Mock).mockRejectedValue(new ValidationError('Illegal automatic status transition'));

    await expect(
      leadService.applyQuotationWorkflowStatus('lead1', ['svc1'], 'QUOTE SENT', 'admin1')
    ).resolves.toBeUndefined();
  });

  it('still surfaces non-validation errors (e.g. DB failures)', async () => {
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([
      { id: 'ls1', serviceId: 'svc1', status: 'QUOTE PREPARING' },
    ]);
    (statusEngineService.transition as jest.Mock).mockRejectedValue(new Error('connection lost'));

    await expect(
      leadService.applyQuotationWorkflowStatus('lead1', ['svc1'], 'QUOTE SENT', 'admin1')
    ).rejects.toThrow('connection lost');
  });
});

describe('leadService.archive', () => {
  beforeEach(() => jest.clearAllMocks());

  it('archives an unconverted lead with a reason', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      leadNumber: 'L-00001',
      convertedAt: null,
      archivedAt: null,
    });
    (leadRepository.archive as jest.Mock).mockResolvedValue({
      id: 'lead1',
      archivedAt: new Date(),
      archivedById: 'admin1',
      archiveReason: 'No longer interested',
    });

    const result = await leadService.archive('lead1', { reason: 'No longer interested' }, 'admin1');

    expect(result.archivedAt).toBeTruthy();
    expect(result.archiveReason).toBe('No longer interested');
    expect(leadRepository.archive).toHaveBeenCalledWith('lead1', 'admin1', 'No longer interested');
  });

  it('rejects archiving an already-archived lead', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      convertedAt: null,
      archivedAt: new Date(),
    });

    await expect(
      leadService.archive('lead1', { reason: 'Test' }, 'admin1')
    ).rejects.toThrow('already archived');
  });

  it('rejects archiving a converted lead', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      convertedAt: new Date(),
      archivedAt: null,
    });

    await expect(
      leadService.archive('lead1', { reason: 'Test' }, 'admin1')
    ).rejects.toThrow('converted to a Client');
  });

  it('rejects archiving a non-existent lead', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      leadService.archive('lead1', { reason: 'Test' }, 'admin1')
    ).rejects.toThrow('Lead not found');
  });
});

describe('leadService.restore', () => {
  beforeEach(() => jest.clearAllMocks());

  it('restores an archived lead', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      leadNumber: 'L-00001',
      archivedAt: new Date(),
    });
    (leadRepository.restore as jest.Mock).mockResolvedValue({
      id: 'lead1',
      archivedAt: null,
      archivedById: null,
      archiveReason: null,
    });

    const result = await leadService.restore('lead1', 'admin1');

    expect(result.archivedAt).toBeNull();
    expect(leadRepository.restore).toHaveBeenCalledWith('lead1');
  });

  it('rejects restoring a non-archived lead', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      archivedAt: null,
    });

    await expect(leadService.restore('lead1', 'admin1')).rejects.toThrow('not archived');
  });

  it('rejects restoring a non-existent lead', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(leadService.restore('lead1', 'admin1')).rejects.toThrow('Lead not found');
  });
});

describe('leadService.createLead - existing client (clientId)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a Lead linked to an existing Client when clientId is provided', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue({
      id: 'existing-client',
      contactName: 'Jane',
      email: 'jane@example.com',
    });
    (leadRepository.create as jest.Mock).mockResolvedValue({
      id: 'lead2',
      leadNumber: 'L-00002',
      email: 'jane@example.com',
      clientId: 'existing-client',
    });
    (serviceRepository.findById as jest.Mock).mockImplementation((id: string) =>
      Promise.resolve({ id, isActive: true, name: 'Some Service' })
    );
    (leadServiceRepository.createMany as jest.Mock).mockResolvedValue([
      { id: 'ls1', serviceId: 'svc-interior' },
    ]);

    const result = await leadService.createLead({
      contactName: 'Jane Doe',
      phone: '9999999999',
      email: 'jane@example.com',
      clientId: 'existing-client',
      services: [{ serviceId: 'svc-interior' }],
    });

    expect(result.lead.id).toBe('lead2');
    expect(leadRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'existing-client' }),
      expect.anything()
    );
    // No Client should be created — existing one is reused
    expect(clientRepository.create).not.toHaveBeenCalled();
    expect(clientRepository.generateClientNumber).not.toHaveBeenCalled();
  });

  it('rejects when clientId references a non-existent Client', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      leadService.createLead({
        contactName: 'Jane Doe',
        phone: '9999999999',
        email: 'jane@example.com',
        clientId: 'non-existent-client',
        services: [{ serviceId: 'svc-interior' }],
      })
    ).rejects.toThrow('Referenced client account not found');
  });

  it('creates Lead with clientId and does not create a new Client even when password is provided', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue({
      id: 'existing-client',
      contactName: 'Jane',
      email: 'jane@example.com',
    });
    (leadRepository.create as jest.Mock).mockResolvedValue({
      id: 'lead3',
      leadNumber: 'L-00003',
      email: 'jane@example.com',
      clientId: 'existing-client',
    });
    (serviceRepository.findById as jest.Mock).mockImplementation((id: string) =>
      Promise.resolve({ id, isActive: true, name: 'Some Service' })
    );
    (leadServiceRepository.createMany as jest.Mock).mockResolvedValue([
      { id: 'ls1', serviceId: 'svc-interior' },
    ]);

    const result = await leadService.createLead({
      contactName: 'Jane Doe',
      phone: '9999999999',
      email: 'jane@example.com',
      clientId: 'existing-client',
      password: 'securepass123',
      services: [{ serviceId: 'svc-interior' }],
    });

    expect(result.lead.id).toBe('lead3');
    // clientId takes precedence — no new Client created
    expect(clientRepository.create).not.toHaveBeenCalled();
  });
});
