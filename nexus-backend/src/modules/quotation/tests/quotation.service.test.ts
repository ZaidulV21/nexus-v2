jest.mock('../../../core/utils/transaction', () => ({
  runInTransaction: jest.fn((fn) => fn({})),
}));
jest.mock('../quotation.repository', () => ({
  CLIENT_VISIBLE_QUOTATION_STATUSES: ['SENT', 'NEGOTIATION', 'ACCEPTED', 'REJECTED'],
  quotationRepository: {
    create: jest.fn(),
    setActiveVersion: jest.fn(),
    updateStatus: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    listForClient: jest.fn(),
    countForLead: jest.fn().mockResolvedValue(0),
    generateQuotationNumber: jest.fn().mockResolvedValue('Q-00001'),
  },
  quotationVersionRepository: {
    deactivateAllForQuotation: jest.fn(),
    create: jest.fn(),
    createItems: jest.fn(),
    countVersions: jest.fn(),
    findById: jest.fn(),
    createApproval: jest.fn(),
  },
}));
jest.mock('../../lead/lead.repository', () => ({
  leadRepository: { findById: jest.fn() },
}));
jest.mock('../../client/client.repository', () => ({
  clientRepository: { findById: jest.fn() },
}));
jest.mock('../../lead/lead.service', () => ({
  leadService: { applyQuotationWorkflowStatus: jest.fn() },
}));
jest.mock('../../catalog/service.repository', () => ({
  serviceRepository: { findById: jest.fn() },
}));
jest.mock('../../timeline/timeline.service', () => ({ timelineService: { recordEvent: jest.fn() } }));
jest.mock('../../audit/audit.service', () => ({ auditService: { recordAudit: jest.fn() } }));
jest.mock('../../notifications/notifications.service', () => ({ notificationsService: { emitEvent: jest.fn() } }));
jest.mock('../../project/project.service', () => ({ projectService: { create: jest.fn() } }));

import { leadRepository } from '../../lead/lead.repository';
import { leadService } from '../../lead/lead.service';
import { serviceRepository } from '../../catalog/service.repository';
import { quotationRepository, quotationVersionRepository } from '../quotation.repository';
import { projectService } from '../../project/project.service';
import { quotationService } from '../quotation.service';

beforeEach(() => {
  jest.clearAllMocks();
  (quotationRepository.countForLead as jest.Mock).mockResolvedValue(0);
  (quotationRepository.generateQuotationNumber as jest.Mock).mockResolvedValue('Q-00001');
  // Every quotation line item must reference a live catalog service.
  (serviceRepository.findById as jest.Mock).mockImplementation(async (id: string) => ({
    id,
    name: `Service ${id}`,
    isActive: true,
    archivedAt: null,
  }));
});

describe('quotationService.create - Client-only workflow', () => {
  it('computes subtotal, GST, and grand total from line items rather than trusting client input', async () => {
    const { clientRepository } = jest.requireMock('../../client/client.repository');
    (clientRepository.findById as jest.Mock).mockResolvedValue({ id: 'client1', sourceLeadId: 'lead1' });
    (quotationRepository.create as jest.Mock).mockResolvedValue({ id: 'quo1', quotationNumber: 'Q-00001' });
    (quotationVersionRepository.create as jest.Mock).mockResolvedValue({ id: 'ver1', versionNumber: 1 });
    (quotationRepository.findById as jest.Mock).mockResolvedValue({ id: 'quo1', clientId: 'client1', client: {} });

    await quotationService.create(
      {
        clientId: 'client1',
        items: [
          { serviceId: 'svc1', description: 'Interior', quantity: 1, unitPrice: 1000, taxRate: 18 },
          { serviceId: 'svc2', description: 'Electrical', quantity: 1, unitPrice: 500, taxRate: 18 },
        ],
      },
      'admin1'
    );

    const createCall = (quotationVersionRepository.create as jest.Mock).mock.calls[0][0];
    // subtotal = 1500, gst = 270, grandTotal = 1770
    expect(createCall.subtotal).toBe(1500);
    expect(createCall.gstAmount).toBe(270);
    expect(createCall.grandTotal).toBe(1770);
  });

  it('advances QUOTE PREPARING services to QUOTE SENT when the first quotation for a Client is created', async () => {
    const { clientRepository } = jest.requireMock('../../client/client.repository');
    (clientRepository.findById as jest.Mock).mockResolvedValue({ id: 'client1', sourceLeadId: 'lead1' });
    (quotationRepository.countForLead as jest.Mock).mockResolvedValue(0);
    (quotationRepository.create as jest.Mock).mockResolvedValue({ id: 'quo1', quotationNumber: 'Q-00001' });
    (quotationVersionRepository.create as jest.Mock).mockResolvedValue({ id: 'ver1', versionNumber: 1 });
    (quotationRepository.findById as jest.Mock).mockResolvedValue({ id: 'quo1', clientId: 'client1', client: {} });

    await quotationService.create(
      {
        clientId: 'client1',
        items: [{ serviceId: 'svc1', description: 'Interior', quantity: 1, unitPrice: 1000, taxRate: 18 }],
      },
      'admin1'
    );

    // Only services sitting at QUOTE PREPARING move - earlier stages are untouched.
    // Lead Services continue auto-updating even after conversion via sourceLeadId.
    expect(leadService.applyQuotationWorkflowStatus).toHaveBeenCalledWith(
      'lead1',
      ['svc1'],
      'QUOTE SENT',
      'admin1',
      { onlyFromStatus: 'QUOTE PREPARING' }
    );
  });

  it('does not re-trigger QUOTE SENT automation for subsequent quotations of the same Client', async () => {
    const { clientRepository } = jest.requireMock('../../client/client.repository');
    (clientRepository.findById as jest.Mock).mockResolvedValue({ id: 'client1', sourceLeadId: 'lead1' });
    (quotationRepository.countForLead as jest.Mock).mockResolvedValue(1);
    (quotationRepository.create as jest.Mock).mockResolvedValue({ id: 'quo2', quotationNumber: 'Q-00002' });
    (quotationVersionRepository.create as jest.Mock).mockResolvedValue({ id: 'ver1', versionNumber: 1 });
    (quotationRepository.findById as jest.Mock).mockResolvedValue({ id: 'quo2', clientId: 'client1', client: {} });

    await quotationService.create(
      {
        clientId: 'client1',
        items: [{ serviceId: 'svc1', description: 'Interior', quantity: 1, unitPrice: 1000, taxRate: 18 }],
      },
      'admin1'
    );

    expect(leadService.applyQuotationWorkflowStatus).not.toHaveBeenCalled();
  });

  it('rejects quotation creation without a Client ID', async () => {
    await expect(
      quotationService.create(
        {
          clientId: '', // Invalid
          items: [{ serviceId: 'svc1', description: 'Interior', quantity: 1, unitPrice: 1000, taxRate: 18 }],
        } as any,
        'admin1'
      )
    ).rejects.toThrow('Quotations must be created for Clients');
  });
});

describe('quotationService.revise - version history preservation', () => {
  it('deactivates prior versions and creates a new incremented version', async () => {
    (quotationRepository.findById as jest.Mock).mockResolvedValue({ id: 'quo1' });
    (quotationVersionRepository.countVersions as jest.Mock).mockResolvedValue(2);
    (quotationVersionRepository.create as jest.Mock).mockResolvedValue({ id: 'ver3', versionNumber: 3 });

    await quotationService.revise(
      'quo1',
      { items: [{ serviceId: 'svc1', description: 'Interior v2', quantity: 1, unitPrice: 1200, taxRate: 18 }] },
      'admin1'
    );

    expect(quotationVersionRepository.deactivateAllForQuotation).toHaveBeenCalledWith('quo1', {});
    expect(quotationVersionRepository.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ versionNumber: 3 }),
      expect.any(Object)
    );
  });
});

describe('quotationService.approve', () => {
  it('rejects approving a non-active version', async () => {
    (quotationVersionRepository.findById as jest.Mock).mockResolvedValue({
      id: 'ver1',
      isActive: false,
      quotationId: 'quo1',
    });
    await expect(
      quotationService.approve('ver1', { approvalMethod: 'PHONE' }, 'admin1')
    ).rejects.toThrow('Only the active version');
  });
});

describe('quotationService.send and accept', () => {
  it('marks an approved quotation as sent before client actions are allowed', async () => {
    (quotationRepository.findById as jest.Mock).mockResolvedValue({
      id: 'quo1',
      leadId: 'lead1',
      quotationNumber: 'Q-00001',
      status: 'APPROVED',
      lead: { email: 'lead@example.com' },
      client: null,
      activeVersionId: 'ver1',
      versions: [{ id: 'ver1', items: [{ serviceId: 'svc1' }] }],
    });

    await quotationService.send('quo1', 'admin1');

    expect(quotationRepository.updateStatus).toHaveBeenCalledWith('quo1', 'SENT', expect.any(Object));
    // Lead pipeline automation: quoted services move to QUOTE SENT.
    expect(leadService.applyQuotationWorkflowStatus).toHaveBeenCalledWith('lead1', ['svc1'], 'QUOTE SENT', 'admin1');
  });

  it('creates a project only after the client accepts a sent quotation', async () => {
    (quotationRepository.findById as jest.Mock).mockResolvedValue({
      id: 'quo1',
      leadId: 'lead1',
      clientId: 'client1',
      quotationNumber: 'Q-00001',
      status: 'SENT',
      lead: { client: { id: 'client1' }, email: 'lead@example.com' },
      client: { email: 'client@example.com' },
      activeVersionId: 'ver1',
      versions: [{ id: 'ver1', approvals: [{ id: 'ap1' }] }],
    });
    (projectService.create as jest.Mock).mockImplementation(
      async (_input: unknown, _actor: string, inSameTransaction?: (tx: object) => Promise<void>) => {
        // Mirror the real implementation: the callback runs inside the
        // project-creation transaction, flipping the quotation status.
        if (inSameTransaction) await inSameTransaction({});
        return { id: 'proj1' };
      }
    );
    (quotationRepository.findById as jest.Mock).mockResolvedValueOnce({
      id: 'quo1',
      leadId: 'lead1',
      clientId: 'client1',
      quotationNumber: 'Q-00001',
      status: 'SENT',
      lead: { client: { id: 'client1' }, email: 'lead@example.com' },
      client: { email: 'client@example.com' },
      activeVersionId: 'ver1',
      versions: [{ id: 'ver1', approvals: [{ id: 'ap1' }] }],
    });

    await quotationService.accept('quo1', 'client1');

    expect(projectService.create).toHaveBeenCalledWith(
      { leadId: 'lead1', clientId: 'client1', quotationVersionId: 'ver1' },
      'client1',
      expect.any(Function)
    );
    expect(quotationRepository.updateStatus).toHaveBeenCalledWith('quo1', 'ACCEPTED', expect.anything());
  });

  it('rolls the whole acceptance back if the status update fails inside the transaction', async () => {
    (quotationRepository.findById as jest.Mock).mockResolvedValue({
      id: 'quo1',
      leadId: 'lead1',
      clientId: 'client1',
      quotationNumber: 'Q-00001',
      status: 'SENT',
      lead: { client: { id: 'client1' }, email: 'lead@example.com' },
      client: { email: 'client@example.com' },
      activeVersionId: 'ver1',
      versions: [{ id: 'ver1', approvals: [{ id: 'ap1' }] }],
    });
    // The real projectService.create runs the callback inside its DB
    // transaction - a throwing callback aborts the transaction, so the
    // mock rejects the same way the real transaction wrapper would.
    (projectService.create as jest.Mock).mockImplementation(
      async (_input: unknown, _actor: string, inSameTransaction?: (tx: object) => Promise<void>) => {
        if (inSameTransaction) await inSameTransaction({});
        return { id: 'proj1' };
      }
    );
    (quotationRepository.updateStatus as jest.Mock).mockRejectedValueOnce(new Error('enum mismatch'));

    await expect(quotationService.accept('quo1', 'client1')).rejects.toThrow('enum mismatch');
  });
});
describe('quotationService.getForClient - portal visibility rules', () => {
  const baseQuotation = {
    id: 'quo1',
    clientId: 'client1',
    quotationNumber: 'Q-00001',
    lead: { client: { id: 'client1' } },
    versions: [],
  };

  it('hides a DRAFT quotation from its own client (404, not 403)', async () => {
    (quotationRepository.findById as jest.Mock).mockResolvedValue({ ...baseQuotation, status: 'DRAFT' });
    await expect(quotationService.getForClient('quo1', 'client1')).rejects.toThrow('Quotation not found');
  });

  it('hides an internally APPROVED (not yet sent) quotation from the client', async () => {
    (quotationRepository.findById as jest.Mock).mockResolvedValue({ ...baseQuotation, status: 'APPROVED' });
    await expect(quotationService.getForClient('quo1', 'client1')).rejects.toThrow('Quotation not found');
  });

  it('returns a SENT quotation to its client', async () => {
    (quotationRepository.findById as jest.Mock).mockResolvedValue({ ...baseQuotation, status: 'SENT' });
    const result = await quotationService.getForClient('quo1', 'client1');
    expect(result.status).toBe('SENT');
  });

  it('keeps NEGOTIATION / ACCEPTED / REJECTED quotations visible to the client', async () => {
    for (const status of ['NEGOTIATION', 'ACCEPTED', 'REJECTED']) {
      (quotationRepository.findById as jest.Mock).mockResolvedValue({ ...baseQuotation, status });
      const result = await quotationService.getForClient('quo1', 'client1');
      expect(result.status).toBe(status);
    }
  });

  it('still rejects access by a different client before revealing status', async () => {
    (quotationRepository.findById as jest.Mock).mockResolvedValue({ ...baseQuotation, status: 'SENT' });
    await expect(quotationService.getForClient('quo1', 'other-client')).rejects.toThrow(
      'Quotation does not belong to this Client'
    );
  });
});
