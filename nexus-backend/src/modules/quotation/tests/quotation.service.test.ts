jest.mock('../../../core/utils/transaction', () => ({
  runInTransaction: jest.fn((fn) => fn({})),
}));
jest.mock('../quotation.repository', () => ({
  quotationRepository: {
    create: jest.fn(),
    setActiveVersion: jest.fn(),
    updateStatus: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    listForClient: jest.fn(),
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
jest.mock('../../timeline/timeline.service', () => ({ timelineService: { recordEvent: jest.fn() } }));
jest.mock('../../audit/audit.service', () => ({ auditService: { recordAudit: jest.fn() } }));
jest.mock('../../notifications/notifications.service', () => ({ notificationsService: { emitEvent: jest.fn() } }));
jest.mock('../../project/project.service', () => ({ projectService: { create: jest.fn() } }));

import { leadRepository } from '../../lead/lead.repository';
import { quotationRepository, quotationVersionRepository } from '../quotation.repository';
import { projectService } from '../../project/project.service';
import { quotationService } from '../quotation.service';

describe('quotationService.create - server-side total calculation', () => {
  it('computes subtotal, GST, and grand total from line items rather than trusting client input', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({ id: 'lead1' });
    (quotationRepository.create as jest.Mock).mockResolvedValue({ id: 'quo1', quotationNumber: 'Q-00001' });
    (quotationVersionRepository.create as jest.Mock).mockResolvedValue({ id: 'ver1', versionNumber: 1 });
    (quotationRepository.findById as jest.Mock).mockResolvedValue({ id: 'quo1' });

    await quotationService.create(
      {
        leadId: 'lead1',
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
      quotationNumber: 'Q-00001',
      status: 'APPROVED',
      lead: { email: 'lead@example.com' },
      client: null,
    });

    await quotationService.send('quo1', 'admin1');

    expect(quotationRepository.updateStatus).toHaveBeenCalledWith('quo1', 'SENT', expect.any(Object));
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