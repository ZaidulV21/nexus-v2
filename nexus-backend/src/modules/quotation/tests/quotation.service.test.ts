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

import { leadRepository } from '../../lead/lead.repository';
import { quotationRepository, quotationVersionRepository } from '../quotation.repository';
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