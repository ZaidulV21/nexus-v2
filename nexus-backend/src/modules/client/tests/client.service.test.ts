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
    updateAccountStatus: jest.fn(),
    list: jest.fn(),
    getSummary: jest.fn(),
    listServices: jest.fn(),
  },
}));
jest.mock('../../lead/lead.repository', () => ({
  leadRepository: { findById: jest.fn(), markConverted: jest.fn() },
  leadServiceRepository: { listForLead: jest.fn().mockResolvedValue([]), markConverted: jest.fn() },
}));
jest.mock('../../quotation/quotation.repository', () => ({
  quotationRepository: { migrateLeadQuotationsToClient: jest.fn().mockResolvedValue({ count: 0 }) },
}));
jest.mock('../../../config/database', () => ({
  prisma: { passwordResetToken: { deleteMany: jest.fn(), create: jest.fn() } },
}));
jest.mock('../../timeline/timeline.service', () => ({ timelineService: { recordEvent: jest.fn() } }));
jest.mock('../../audit/audit.service', () => ({ auditService: { recordAudit: jest.fn() } }));
jest.mock('../../notifications/notifications.service', () => ({ notificationsService: { emitEvent: jest.fn() } }));
jest.mock('../../auth/auth.repository', () => ({
  authRepository: { updateClientPassword: jest.fn() },
}));
jest.mock('../../email/email.service', () => ({
  emailService: { send: jest.fn().mockResolvedValue({ id: 'email-1' }) },
}));
jest.mock('../../company/company.service', () => ({
  companyService: { get: jest.fn().mockResolvedValue({ companyName: 'TestCo' }) },
}));
jest.mock('../../email/templates/client-welcome.template', () => ({
  renderClientWelcomeEmail: jest.fn().mockReturnValue('<html>welcome</html>'),
}));
jest.mock('../../email/templates/password-reset.template', () => ({
  renderPasswordResetEmail: jest.fn().mockReturnValue('<html>reset</html>'),
}));

import { clientRepository } from '../client.repository';
import { leadRepository, leadServiceRepository } from '../../lead/lead.repository';
import { quotationRepository } from '../../quotation/quotation.repository';
import { authRepository } from '../../auth/auth.repository';
import { emailService } from '../../email/email.service';
import { clientService } from '../client.service';

describe('clientService.convertLeadToClient', () => {
  const { notificationsService } = jest.requireMock('../../notifications/notifications.service');
  const { timelineService } = jest.requireMock('../../timeline/timeline.service');
  const { auditService } = jest.requireMock('../../audit/audit.service');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const qualifiedService = (id: string, serviceId: string, overrides: Record<string, unknown> = {}) => ({
    id,
    serviceId,
    status: 'QUOTE PREPARING',
    convertedAt: null,
    service: { name: 'Web Development' },
    ...overrides,
  });

  it('rejects converting a Lead that has no qualified services', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({ id: 'lead1', email: 'x@y.com' });
    (clientRepository.findBySourceLeadId as jest.Mock).mockResolvedValue(null);
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([{ status: 'NEW' }, { status: 'CONTACTED' }]);

    await expect(clientService.convertLeadToClient('lead1')).rejects.toThrow(
      'must be qualified'
    );
  });

  it('reuses an existing Client portal account when one already exists for the Lead', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      leadNumber: 'L-00001',
      email: 'john@example.com',
    });
    (clientRepository.findBySourceLeadId as jest.Mock).mockResolvedValue({
      id: 'existing-client',
      contactName: 'John',
      email: 'john@example.com',
      clientNumber: 'C-00001',
    });
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([
      qualifiedService('ls1', 'svc1'),
    ]);
    (quotationRepository.migrateLeadQuotationsToClient as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await clientService.convertLeadToClient('lead1', 'admin1');
    expect(result.id).toBe('existing-client');
    expect(leadRepository.markConverted).toHaveBeenCalledWith('lead1');
    expect(clientRepository.create).not.toHaveBeenCalled();
    // Every attached service is recorded in Timeline + Audit with actor.
    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'SERVICE_ATTACHED', actorUserId: 'admin1' })
    );
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SERVICE_ATTACHED', actorUserId: 'admin1' })
    );
    // First conversion -> "New Client Created", never "New Service added".
    expect(notificationsService.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'client.account.created', recipient: 'john@example.com' })
    );
    expect(notificationsService.emitEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'client.service.added' })
    );
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
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([{ status: 'QUALIFIED' }]);

    await expect(clientService.convertLeadToClient('lead1', 'admin1')).rejects.toThrow(
      'already exists for this email address'
    );
  });

  it('converts a Lead with a qualified service and creates a Client', async () => {
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
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([
      qualifiedService('ls1', 'svc1'),
    ]);
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
      expect.objectContaining({ clientNumber: 'C-00001', sourceLeadId: 'lead1' }),
      {}
    );
    expect(leadRepository.markConverted).toHaveBeenCalledWith('lead1', {});
    // The service is marked converted inside the same transaction.
    expect(leadServiceRepository.markConverted).toHaveBeenCalledWith('ls1', expect.any(Date), {});
    expect(quotationRepository.migrateLeadQuotationsToClient).toHaveBeenCalledWith('lead1', 'client1', {});

    // The migration is recorded in both the Timeline and the Audit Log,
    // referencing business IDs and the migrated count.
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
    // First conversion -> "New Client Created" only.
    expect(notificationsService.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'client.account.created' })
    );
    expect(notificationsService.emitEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'client.service.added' })
    );
  });

  it('reuses the linked Client when Lead.clientId is set (repeat enquiry)', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead2',
      leadNumber: 'L-00002',
      email: 'jane@example.com',
      clientId: 'existing-client',
    });
    (clientRepository.findById as jest.Mock).mockResolvedValue({
      id: 'existing-client',
      contactName: 'Jane',
      email: 'jane@example.com',
      clientNumber: 'C-00002',
    });
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([
      qualifiedService('ls2', 'svc2'),
    ]);
    (quotationRepository.migrateLeadQuotationsToClient as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await clientService.convertLeadToClient('lead2', 'admin1');
    expect(result.id).toBe('existing-client');
    expect(leadRepository.markConverted).toHaveBeenCalledWith('lead2');
    // No new Client created — the linked one is reused
    expect(clientRepository.create).not.toHaveBeenCalled();
    expect(clientRepository.generateClientNumber).not.toHaveBeenCalled();
    // findBySourceLeadId is NOT called when clientId is set (early return)
    expect(clientRepository.findBySourceLeadId).not.toHaveBeenCalled();
  });

  it('does not record a QUOTATIONS_MIGRATED event when no quotations exist', async () => {
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
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([
      qualifiedService('ls1', 'svc1'),
    ]);
    (clientRepository.generateClientNumber as jest.Mock).mockResolvedValue('C-00001');
    (quotationRepository.migrateLeadQuotationsToClient as jest.Mock).mockResolvedValue({ count: 0 });
    (clientRepository.create as jest.Mock).mockResolvedValue({
      id: 'client1',
      clientNumber: 'C-00001',
      email: 'john@example.com',
      contactName: 'John',
    });

    await clientService.convertLeadToClient('lead1', 'admin1');
    // No QUOTATIONS_MIGRATED timeline/audit noise when nothing moved over.
    expect(timelineService.recordEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'QUOTATIONS_MIGRATED' })
    );
    expect(auditService.recordAudit).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'QUOTATIONS_MIGRATED' })
    );
  });

  it('attaches a newly-qualified service to an existing Client on a LATER conversion', async () => {
    // Lead already converted once - a second service has since been qualified.
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      leadNumber: 'L-00001',
      email: 'john@example.com',
      contactName: 'John',
      convertedAt: new Date('2026-07-01T00:00:00Z'),
    });
    (clientRepository.findBySourceLeadId as jest.Mock).mockResolvedValue({
      id: 'client1',
      contactName: 'John',
      email: 'john@example.com',
      clientNumber: 'C-00001',
    });
    // svc1 already attached; svc2 is the new qualified one.
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([
      qualifiedService('ls1', 'svc1', { convertedAt: new Date('2026-07-01T00:00:00Z') }),
      qualifiedService('ls2', 'svc2'),
    ]);
    (quotationRepository.migrateLeadQuotationsToClient as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await clientService.convertLeadToClient('lead1', 'admin1');
    expect(result.id).toBe('client1');
    // No Client created, no duplicate conversion milestone.
    expect(clientRepository.create).not.toHaveBeenCalled();
    expect(leadRepository.markConverted).not.toHaveBeenCalled();
    // Only the new service is marked/attached - never a duplicate.
    expect(leadServiceRepository.markConverted).toHaveBeenCalledTimes(1);
    expect(leadServiceRepository.markConverted).toHaveBeenCalledWith('ls2', expect.any(Date), {});
    // Later conversion -> "New Service added" notification, NOT "New Client Created".
    expect(notificationsService.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'client.service.added', sendEmail: false })
    );
    expect(notificationsService.emitEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'client.account.created' })
    );
    // Still recorded in Timeline + Audit.
    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'SERVICE_ATTACHED', entityId: 'client1', actorUserId: 'admin1' })
    );
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SERVICE_ATTACHED', actorUserId: 'admin1' })
    );
  });

  it('is idempotent - a repeat conversion with no new services is a no-op', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      leadNumber: 'L-00001',
      email: 'john@example.com',
      contactName: 'John',
      convertedAt: new Date('2026-07-01T00:00:00Z'),
    });
    (clientRepository.findBySourceLeadId as jest.Mock).mockResolvedValue({
      id: 'client1',
      contactName: 'John',
      email: 'john@example.com',
      clientNumber: 'C-00001',
    });
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([
      qualifiedService('ls1', 'svc1', { convertedAt: new Date('2026-07-01T00:00:00Z') }),
    ]);

    const result = await clientService.convertLeadToClient('lead1', 'admin1');
    expect(result.id).toBe('client1');
    expect(leadServiceRepository.markConverted).not.toHaveBeenCalled();
    expect(quotationRepository.migrateLeadQuotationsToClient).not.toHaveBeenCalled();
    expect(leadRepository.markConverted).not.toHaveBeenCalled();
    expect(notificationsService.emitEvent).not.toHaveBeenCalled();
    expect(timelineService.recordEvent).not.toHaveBeenCalled();
  });
});

describe('clientService.resetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resets password and sends email', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue({
      id: 'client1',
      contactName: 'John',
      email: 'john@example.com',
    });

    const result = await clientService.resetPassword('client1', 'admin1');
    expect(result).toEqual({ success: true });
    expect(authRepository.updateClientPassword).toHaveBeenCalledWith('client1', expect.any(String));
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'john@example.com' })
    );
  });

  it('throws NotFoundError for non-existent client', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(clientService.resetPassword('nonexistent')).rejects.toThrow('Client not found');
  });
});

describe('clientService.sendWelcomeEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends welcome email to client', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue({
      id: 'client1',
      contactName: 'John',
      email: 'john@example.com',
    });

    const result = await clientService.sendWelcomeEmail('client1', 'admin1');
    expect(result).toEqual({ success: true });
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'john@example.com' })
    );
  });

  it('throws NotFoundError for non-existent client', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(clientService.sendWelcomeEmail('nonexistent')).rejects.toThrow('Client not found');
  });
});

describe('clientService.toggleActive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deactivates an active client', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue({
      id: 'client1',
      isActive: true,
    });
    (clientRepository.updateAccountStatus as jest.Mock).mockResolvedValue({
      id: 'client1',
      isActive: false,
    });

    const result = await clientService.toggleActive('client1', false, 'admin1');
    expect(result.isActive).toBe(false);
    expect(clientRepository.updateAccountStatus).toHaveBeenCalledWith('client1', false);
  });

  it('activates an inactive client', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue({
      id: 'client1',
      isActive: false,
    });
    (clientRepository.updateAccountStatus as jest.Mock).mockResolvedValue({
      id: 'client1',
      isActive: true,
    });

    const result = await clientService.toggleActive('client1', true, 'admin1');
    expect(result.isActive).toBe(true);
    expect(clientRepository.updateAccountStatus).toHaveBeenCalledWith('client1', true);
  });

  it('throws when status is already as requested', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue({
      id: 'client1',
      isActive: true,
    });

    await expect(clientService.toggleActive('client1', true)).rejects.toThrow('already active');
  });

  it('throws NotFoundError for non-existent client', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(clientService.toggleActive('nonexistent', false)).rejects.toThrow('Client not found');
  });
});

describe('clientService.getSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns aggregated KPIs and service history for a client', async () => {
    (clientRepository.getSummary as jest.Mock).mockResolvedValue({
      client: { id: 'client1', contactName: 'John' },
      kpis: {
        totalServiceRequests: 3,
        activeProjects: 1,
        completedProjects: 1,
        pendingQuotations: 1,
        totalInvoices: 2,
        lifetimeRevenue: 5000,
      },
      serviceHistory: [
        {
          id: 'lead1',
          leadNumber: 'L-00001',
          services: [{ name: 'Interior Design', status: 'QUOTE SENT' }],
          currentStatus: 'QUOTE SENT',
          relatedProjectNumber: 'P-00001',
          projectStatus: 'IN PROGRESS',
        },
      ],
    });

    const result = await clientService.getSummary('client1');
    expect(result.kpis.totalServiceRequests).toBe(3);
    expect(result.kpis.lifetimeRevenue).toBe(5000);
    expect(result.serviceHistory).toHaveLength(1);
    expect(result.serviceHistory[0].leadNumber).toBe('L-00001');
  });

  it('throws NotFoundError for non-existent client', async () => {
    (clientRepository.getSummary as jest.Mock).mockResolvedValue(null);

    await expect(clientService.getSummary('nonexistent')).rejects.toThrow('Client not found');
  });
});

describe('clientService.getServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the distinct services attached to a client', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue({ id: 'client1', sourceLeadId: 'lead1' });
    (clientRepository.listServices as jest.Mock).mockResolvedValue([
      { id: 'svc1', name: 'Interior Design', category: { name: 'Design' } },
      { id: 'svc2', name: 'Electrical', category: null },
    ]);

    const services = await clientService.getServices('client1');
    expect(services).toHaveLength(2);
    expect(services[0].name).toBe('Interior Design');
    expect(clientRepository.listServices).toHaveBeenCalledWith('client1');
  });

  it('returns an empty list when the client has no attached services', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue({ id: 'client1', sourceLeadId: 'lead1' });
    (clientRepository.listServices as jest.Mock).mockResolvedValue([]);

    const services = await clientService.getServices('client1');
    expect(services).toEqual([]);
  });

  it('throws NotFoundError for a non-existent client', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(clientService.getServices('nonexistent')).rejects.toThrow('Client not found');
  });
});
