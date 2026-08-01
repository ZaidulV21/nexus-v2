const mockPaymentFindFirst = jest.fn();
const mockPaymentFindUnique = jest.fn();
const mockPaymentUpdate = jest.fn();
const mockQuotationFindUnique = jest.fn();
const mockQuotationFindFirst = jest.fn();
const mockQuotationUpdate = jest.fn();
const mockInvoiceFindUnique = jest.fn();
const mockInvoiceFindFirst = jest.fn();
const mockInvoiceUpdate = jest.fn();
const mockServiceFindMany = jest.fn().mockResolvedValue([]);

jest.mock('../../../config/database', () => ({
  prisma: {
    payment: {
      findFirst: (...args: any[]) => mockPaymentFindFirst(...args),
      findUnique: (...args: any[]) => mockPaymentFindUnique(...args),
      update: (...args: any[]) => mockPaymentUpdate(...args),
    },
    quotation: {
      findUnique: (...args: any[]) => mockQuotationFindUnique(...args),
      findFirst: (...args: any[]) => mockQuotationFindFirst(...args),
      update: (...args: any[]) => mockQuotationUpdate(...args),
    },
    invoice: {
      findUnique: (...args: any[]) => mockInvoiceFindUnique(...args),
      findFirst: (...args: any[]) => mockInvoiceFindFirst(...args),
      update: (...args: any[]) => mockInvoiceUpdate(...args),
    },
    service: { findMany: (...args: any[]) => mockServiceFindMany(...args) },
  },
}));

jest.mock('../../../config/env', () => ({
  env: { cloudinaryCloudName: '', localStoragePath: './uploads' },
}));

jest.mock('../../../core/storage/cloudinary.provider', () => ({
  cloudinaryProvider: { save: jest.fn() },
}));
jest.mock('../../../core/storage/localStorage.provider', () => ({
  localStorageProvider: { save: jest.fn().mockResolvedValue({ fileUrl: 'rct.pdf' }) },
}));

jest.mock('../../company/company.branding', () => ({
  getCompanyBranding: jest.fn().mockResolvedValue({
    companyName: 'Test Company',
    legalBusinessName: 'Test Company Pvt Ltd',
    logoUrl: null,
    gstNumber: '22AAAAA0000A1Z5',
    panNumber: 'AAAAA0000A',
    cin: null,
    email: 'test@company.com',
    phone: '+911234567890',
    whatsappNumber: null,
    website: null,
    addressLine1: '123 Test Street',
    addressLine2: null,
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400001',
    currency: 'INR',
    currencySymbol: '₹',
    bankName: 'State Bank of India',
    accountHolder: 'Test Company',
    accountNumber: '1234567890',
    ifsc: 'SBIN0001234',
    branch: 'Mumbai Main',
    upiId: 'test@upi',
    qrCodeUrl: null,
    companySignatureUrl: null,
    companyStampUrl: null,
  }),
}));

jest.mock('../../audit/audit.service', () => ({
  auditService: { recordAudit: jest.fn().mockResolvedValue({}) },
}));
jest.mock('../../timeline/timeline.service', () => ({
  timelineService: { recordEvent: jest.fn().mockResolvedValue({}) },
}));

import { pdfService } from '../pdf.service';
import { timelineService } from '../../timeline/timeline.service';
import { auditService } from '../../audit/audit.service';
import { localStorageProvider } from '../../../core/storage/localStorage.provider';

const mockPayment = {
  id: 'pay-1',
  amount: 50000,
  method: 'RAZORPAY',
  transactionReference: 'ref-1',
  referenceNote: null,
  paidAt: new Date('2026-07-31T12:00:00Z'),
  receiptUrl: null,
  receiptGeneratedAt: null,
  invoiceId: 'inv-1',
  invoice: {
    invoiceNumber: 'INV/2026-27/00001',
    label: 'Web Development Phase 1',
    grandTotal: 100000,
    client: {
      contactName: 'Rahul Sharma',
      companyName: 'Sharma Industries',
      email: 'rahul@sharma.com',
      phone: '+919876543210',
      gstin: '27AABCU9603R1ZM',
    },
    project: { projectNumber: 'PRJ-00001' },
    payments: [{ amount: 50000 }],
  },
};

describe('pdfService.generate - RECEIPT lifecycle milestones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPaymentFindFirst.mockResolvedValue(mockPayment);
    mockPaymentFindUnique.mockResolvedValue(mockPayment);
    mockPaymentUpdate.mockResolvedValue({ id: 'pay-1', receiptUrl: '/uploads/rct.pdf' });
  });

  it('records Generated -> Available on the timeline and Stored to the Audit Log only, in order', async () => {
    await pdfService.generate('RECEIPT', 'pay-1', 'actor-1');

    // Business milestones stay on the business timeline...
    const eventTypes = (timelineService.recordEvent as jest.Mock).mock.calls.map((c) => c[0].eventType);
    expect(eventTypes).toEqual(['RECEIPT_GENERATED', 'RECEIPT_AVAILABLE']);

    const firstCall = (timelineService.recordEvent as jest.Mock).mock.calls[0][0];
    expect(firstCall.entityType).toBe('INVOICE');
    expect(firstCall.entityId).toBe('inv-1');
    expect(firstCall.actorUserId).toBe('actor-1');
    expect(firstCall.description).toContain('50000');

    // ...while the low-level PDF-storage detail goes to the Audit Log only.
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'INVOICE',
        entityId: 'inv-1',
        action: 'RECEIPT_STORED',
        afterState: expect.objectContaining({ paymentId: 'pay-1', amount: 50000 }),
      })
    );

    expect(localStorageProvider.save).toHaveBeenCalled();
    expect(mockPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay-1' },
        data: expect.objectContaining({ receiptUrl: '/uploads/rct.pdf' }),
      })
    );
  });

  it('does not re-record the milestones when the receipt already exists', async () => {
    const existing = { ...mockPayment, receiptUrl: 'http://existing/r.pdf', receiptGeneratedAt: new Date() };
    mockPaymentFindUnique.mockResolvedValue(existing);
    mockPaymentFindFirst.mockResolvedValue(existing);

    await pdfService.generate('RECEIPT', 'pay-1', 'actor-1');

    expect(timelineService.recordEvent).not.toHaveBeenCalled();
  });

  it('does not record receipt milestones when rendering a QUOTATION or INVOICE', async () => {
    mockQuotationFindFirst.mockResolvedValue({
      id: 'q-1',
      quotationNumber: 'Q-00001',
      status: 'APPROVED',
      createdAt: new Date('2026-07-21'),
      validUntil: null,
      notes: null,
      termsAndConditions: null,
      paymentTerms: null,
      client: { contactName: 'Rahul Sharma', companyName: 'Sharma Industries', email: 'rahul@sharma.com', phone: '+919876543210', gstin: '27AABCU9603R1ZM' },
      lead: null,
      versions: [
        {
          versionNumber: 1,
          items: [{ description: 'Service', serviceName: 'Test Service', quantity: 1, unitPrice: 10000, taxRate: 18, taxAmount: 1800, lineTotal: 11800, hsnSacCode: '9954' }],
          subtotal: 10000,
          discount: 0,
          gstAmount: 1800,
          transportation: 0,
          installation: 0,
          grandTotal: 11800,
        },
      ],
    });
    mockQuotationFindUnique.mockResolvedValue({ quotationNumber: 'Q-00001' });
    mockQuotationUpdate.mockResolvedValue({ id: 'q-1' });

    mockInvoiceFindFirst.mockResolvedValue({
      id: 'i-1',
      invoiceNumber: 'INV/2026-27/00001',
      label: 'Phase 1',
      status: 'ISSUED',
      issuedAt: new Date('2026-07-21'),
      items: [{ description: 'Service', quantity: 1, unitPrice: 10000, taxRate: 18, taxAmount: 1800, lineTotal: 11800, hsnSacCode: '9954' }],
      payments: [],
      grandTotal: 11800,
      subtotal: 10000,
      gstAmount: 1800,
      client: { contactName: 'Rahul Sharma', companyName: 'Sharma Industries', email: 'rahul@sharma.com', phone: '+919876543210', gstin: '27AABCU9603R1ZM' },
      project: null,
    });
    mockInvoiceFindUnique.mockResolvedValue({ invoiceNumber: 'INV/2026-27/00001' });
    mockInvoiceUpdate.mockResolvedValue({ id: 'i-1' });

    await pdfService.generate('QUOTATION', 'q-1', 'actor-1');
    await pdfService.generate('INVOICE', 'i-1', 'actor-1');

    expect(mockQuotationUpdate).toHaveBeenCalled();
    expect(mockInvoiceUpdate).toHaveBeenCalled();
    expect(timelineService.recordEvent).not.toHaveBeenCalled();
  });
});
