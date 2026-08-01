import crypto from 'crypto';

const TEST_RAZORPAY_SECRET = 'rzp_test_secret';

jest.mock('../../../config/env', () => ({
  env: {
    razorpayKeyId: 'rzp_test_key',
    razorpayKeySecret: TEST_RAZORPAY_SECRET,
    jwtSecret: 'test-jwt-secret',
    appUrl: 'http://localhost:5173',
    databaseUrl: 'postgresql://test:test@localhost:5432/test',
    localStoragePath: './uploads',
    resendApiKey: 'test-resend-key',
    cloudinaryCloudName: 'test',
    cloudinaryApiKey: 'test',
    cloudinaryApiSecret: 'test',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    otpExpiryMinutes: 10,
  },
}));

jest.mock('../../../core/utils/transaction', () => ({
  runInTransaction: jest.fn((fn) => fn({})),
}));

jest.mock('../../timeline/timeline.service', () => ({
  timelineService: { recordEvent: jest.fn().mockResolvedValue({}) },
}));
jest.mock('../../notifications/notifications.service', () => ({
  notificationsService: { emitEvent: jest.fn().mockResolvedValue({ emailStatus: 'SENT' }) },
}));
jest.mock('../../audit/audit.service', () => ({
  auditService: { recordAudit: jest.fn().mockResolvedValue({}) },
}));
jest.mock('../../pdf/pdf.service', () => ({
  pdfService: { generateReceipt: jest.fn().mockResolvedValue({ pdfUrl: 'http://test/r.pdf' }) },
}));

const mockOrdersFetch = jest.fn();
const mockPaymentsFetch = jest.fn();
const mockOrdersCreate = jest.fn();
const mockPaymentRefund = jest.fn();

jest.mock('razorpay', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    orders: {
      create: mockOrdersCreate,
      fetch: mockOrdersFetch,
    },
    payments: {
      fetch: mockPaymentsFetch,
      refund: mockPaymentRefund,
    },
  })),
}));

const mockFindById = jest.fn();
const mockCreate = jest.fn();
const mockSumForInvoice = jest.fn();
const mockFindByGatewayTransactionId = jest.fn();
const mockPaymentFindById = jest.fn();
const mockMarkRefunded = jest.fn();

jest.mock('../../invoice/invoice.repository', () => ({
  invoiceRepository: { findById: (...args: any[]) => mockFindById(...args) },
  paymentRepository: {
    create: (...args: any[]) => mockCreate(...args),
    sumForInvoice: (...args: any[]) => mockSumForInvoice(...args),
    findByGatewayTransactionId: (...args: any[]) => mockFindByGatewayTransactionId(...args),
    findById: (...args: any[]) => mockPaymentFindById(...args),
    markRefunded: (...args: any[]) => mockMarkRefunded(...args),
  },
}));

import { verifyPayment, refundPayment } from '../payments.service';
import { Prisma } from '@prisma/client';
import { AppError } from '../../../core/errors/AppError';
import { timelineService } from '../../timeline/timeline.service';
import { notificationsService } from '../../notifications/notifications.service';
import { pdfService } from '../../pdf/pdf.service';
import { auditService } from '../../audit/audit.service';

function generateSignature(orderId: string, paymentId: string): string {
  return crypto.createHmac('sha256', TEST_RAZORPAY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
}

describe('verifyPayment', () => {
  const mockInvoice = {
    id: 'inv-1',
    status: 'ISSUED',
    grandTotal: 100000,
    invoiceNumber: 'INV/2026-27/00001',
    clientId: 'client-1',
    projectId: 'proj-1',
    client: { email: 'client@test.com' },
  };

  const orderId = 'order_Oq7aJfVX7ZyE1t';
  const paymentId = 'pay_Oq7bLgWY8AbF2u';

  beforeEach(() => {
    jest.clearAllMocks();

    mockFindByGatewayTransactionId.mockResolvedValue(null);
    mockFindById.mockResolvedValue(mockInvoice);
    mockSumForInvoice.mockResolvedValue({ _sum: { amount: 0 } });
    mockOrdersFetch.mockResolvedValue({ id: orderId, notes: { invoiceId: 'inv-1' } });
    mockPaymentsFetch.mockResolvedValue({ id: paymentId, amount: 5000000, status: 'captured' });
    mockCreate.mockResolvedValue({
      id: 'payment-1',
      amount: 50000,
      method: 'RAZORPAY',
      status: 'SUCCESS',
      gatewayTransactionId: paymentId,
      paidAt: new Date('2026-07-31T12:00:00Z'),
    });
  });

  it('rejects invalid signature', async () => {
    await expect(
      verifyPayment(
        { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: 'invalid_sig' },
        'client-1',
      ),
    ).rejects.toThrow(AppError);
  });

  it('rejects duplicate payment', async () => {
    mockFindByGatewayTransactionId.mockResolvedValue({ id: 'existing-pay', gatewayTransactionId: paymentId });

    const sig = generateSignature(orderId, paymentId);

    await expect(
      verifyPayment(
        { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: sig },
        'client-1',
      ),
    ).rejects.toMatchObject({ message: 'Payment already processed', statusCode: 409 });
  });

  it('returns a clean 409 when a duplicate verification hits the DB unique constraint (race)', async () => {
    // Both requests pass the application-level pre-check (findByGatewayTransactionId
    // returns null for each), so the database UNIQUE index is what stops the second
    // one: its insert throws P2002, which must map to the same business error.
    const sig = generateSignature(orderId, paymentId);
    mockCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on gatewayTransactionId', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['gatewayTransactionId'] },
      })
    );

    await expect(
      verifyPayment(
        { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: sig },
        'client-1',
      ),
    ).rejects.toMatchObject({ message: 'Payment already processed', statusCode: 409 });

    // The failed insert must not produce any business side effects.
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(timelineService.recordEvent).not.toHaveBeenCalled();
    expect(notificationsService.emitEvent).not.toHaveBeenCalled();
    expect(pdfService.generateReceipt).not.toHaveBeenCalled();
  });

  it('creates exactly one payment when two concurrent verification requests race past the pre-check', async () => {
    const sig = generateSignature(orderId, paymentId);
    const created = new Set<string>();
    // Stateful mock mimicking the DB UNIQUE index on gatewayTransactionId.
    mockCreate.mockImplementation((data: any) => {
      if (created.has(data.gatewayTransactionId)) {
        return Promise.reject(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed on gatewayTransactionId', {
            code: 'P2002',
            clientVersion: '5.22.0',
            meta: { target: ['gatewayTransactionId'] },
          })
        );
      }
      created.add(data.gatewayTransactionId);
      return Promise.resolve({
        id: 'payment-1',
        amount: data.amount,
        method: 'RAZORPAY',
        status: 'SUCCESS',
        gatewayTransactionId: data.gatewayTransactionId,
        paidAt: new Date('2026-07-31T12:00:00Z'),
      });
    });

    const results = await Promise.allSettled([
      verifyPayment({ razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: sig }, 'client-1'),
      verifyPayment({ razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: sig }, 'client-1'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as any).reason).toMatchObject({ message: 'Payment already processed', statusCode: 409 });

    // Exactly one Payment record can ever be created for the Razorpay transaction.
    expect(mockCreate).toHaveBeenCalledTimes(2);

    // Only the winning request runs the timeline/notification pipeline.
    expect(timelineService.recordEvent).toHaveBeenCalledTimes(2); // PAYMENT_SUCCESSFUL + PARTIAL_PAYMENT
    expect(notificationsService.emitEvent).toHaveBeenCalledTimes(2); // payment.successful + payment.receipt_available
  });

  it('rejects when order is missing invoiceId in notes', async () => {
    const sig = generateSignature(orderId, paymentId);
    mockOrdersFetch.mockResolvedValue({ id: orderId, notes: {} });

    await expect(
      verifyPayment(
        { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: sig },
        'client-1',
      ),
    ).rejects.toThrow('missing invoice reference');
  });

  it('rejects when invoice does not belong to client', async () => {
    const sig = generateSignature(orderId, paymentId);
    mockFindById.mockResolvedValue({ ...mockInvoice, clientId: 'other-client' });

    await expect(
      verifyPayment(
        { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: sig },
        'client-1',
      ),
    ).rejects.toThrow('not found');
  });

  it('rejects when amount exceeds outstanding', async () => {
    const sig = generateSignature(orderId, paymentId);
    mockPaymentsFetch.mockResolvedValue({ id: paymentId, amount: 20000000, status: 'captured' });
    mockSumForInvoice.mockResolvedValue({ _sum: { amount: 0 } });

    await expect(
      verifyPayment(
        { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: sig },
        'client-1',
      ),
    ).rejects.toThrow('exceeds');
  });

  it('saves payment and returns updated balances on valid request', async () => {
    const sig = generateSignature(orderId, paymentId);
    mockSumForInvoice.mockResolvedValue({ _sum: { amount: 0 } });
    mockCreate.mockResolvedValue({
      id: 'payment-1',
      amount: 50000,
      method: 'RAZORPAY',
      status: 'SUCCESS',
      gatewayTransactionId: paymentId,
      paidAt: new Date('2026-07-31T12:00:00Z'),
    });

    const result = await verifyPayment(
      { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: sig },
      'client-1',
    );

    expect(result.payment.amount).toBe(50000);
    expect(result.payment.gatewayTransactionId).toBe(paymentId);
    expect(result.payment.status).toBe('SUCCESS');

    expect(result.invoice.paidAmount).toBe(50000);
    expect(result.invoice.outstandingAmount).toBe(50000);
    expect(result.invoice.displayStatus).toBe('PARTIALLY PAID');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: 'inv-1',
        clientId: 'client-1',
        amount: 50000,
        method: 'RAZORPAY',
        status: 'SUCCESS',
        gatewayTransactionId: paymentId,
      }),
      expect.anything(),
    );

    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'PAYMENT_SUCCESSFUL' })
    );
    expect(notificationsService.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'payment.successful',
        payload: expect.objectContaining({ paymentId: 'payment-1', invoiceId: 'inv-1', paymentMethod: 'RAZORPAY' }),
      })
    );
    expect(notificationsService.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'payment.receipt_available' })
    );

    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'PARTIAL_PAYMENT' })
    );

    // Ordering: the payment must be recorded BEFORE the paid-status milestone
    // (a payment cannot partially pay an invoice before it is recorded).
    const eventTypes = (timelineService.recordEvent as jest.Mock).mock.calls.map((c) => c[0].eventType);
    expect(eventTypes.indexOf('PAYMENT_SUCCESSFUL')).toBeLessThan(eventTypes.indexOf('PARTIAL_PAYMENT'));

    // The receipt lifecycle (Generated -> Stored -> Available) is recorded by
    // pdf.service on first generation; the payment flow only kicks it off,
    // passing the client as the actor.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pdfService.generateReceipt).toHaveBeenCalledWith('payment-1', 'client-1');
  });

  it('returns PAID when outstanding reaches zero', async () => {
    const sig = generateSignature(orderId, paymentId);
    mockPaymentsFetch.mockResolvedValue({ id: paymentId, amount: 10000000, status: 'captured' });
    mockSumForInvoice.mockResolvedValue({ _sum: { amount: 0 } });
    mockCreate.mockResolvedValue({
      id: 'payment-1',
      amount: 100000,
      method: 'RAZORPAY',
      status: 'SUCCESS',
      gatewayTransactionId: paymentId,
      paidAt: new Date('2026-07-31T12:00:00Z'),
    });

    const result = await verifyPayment(
      { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: sig },
      'client-1',
    );

    expect(result.invoice.paidAmount).toBe(100000);
    expect(result.invoice.outstandingAmount).toBe(0);
    expect(result.invoice.displayStatus).toBe('PAID');

    // Payment events strictly ordered: a payment is recorded before it can
    // fully pay the invoice. (The receipt lifecycle milestones are recorded by
    // pdf.service on first generation, covered in pdf.service tests.)
    const eventTypes = (timelineService.recordEvent as jest.Mock).mock.calls.map((c) => c[0].eventType);
    expect(eventTypes).toEqual(['PAYMENT_SUCCESSFUL', 'INVOICE_PAID']);
  });

  it('rejects payment against cancelled invoice', async () => {
    const sig = generateSignature(orderId, paymentId);
    mockFindById.mockResolvedValue({ ...mockInvoice, status: 'CANCELLED' });

    await expect(
      verifyPayment(
        { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: sig },
        'client-1',
      ),
    ).rejects.toThrow('cancelled');
  });
});

describe('refundPayment', () => {
  const razorpayPayment = {
    id: 'payment-1',
    invoiceId: 'inv-1',
    clientId: 'client-1',
    projectId: 'proj-1',
    amount: 50000,
    method: 'RAZORPAY',
    status: 'SUCCESS',
    gatewayTransactionId: 'pay_rzp1',
    gatewayMetadata: { order_id: 'order_1', payment_id: 'pay_rzp1' },
    receiptSentAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPaymentFindById.mockResolvedValue(razorpayPayment);
    mockFindById.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV/2026-27/00001' });
    mockMarkRefunded.mockResolvedValue({ ...razorpayPayment, status: 'REFUNDED' });
  });

  it('rejects when the payment does not exist', async () => {
    mockPaymentFindById.mockResolvedValue(null);

    await expect(refundPayment('missing', 'admin-1')).rejects.toThrow('not found');
    expect(mockMarkRefunded).not.toHaveBeenCalled();
  });

  it('rejects refunding a non-SUCCESS payment (idempotency: a refunded payment cannot be refunded again)', async () => {
    mockPaymentFindById.mockResolvedValue({ ...razorpayPayment, status: 'REFUNDED' });

    await expect(refundPayment('payment-1', 'admin-1')).rejects.toThrow('Only successful payments can be refunded');
    expect(mockMarkRefunded).not.toHaveBeenCalled();
  });

  it('refunds a Razorpay payment via the gateway and records REFUND_PROCESSED once', async () => {
    mockPaymentRefund.mockResolvedValue({ id: 'refnd_1', status: 'processed' });

    const result = await refundPayment('payment-1', 'admin-1');

    expect(mockPaymentRefund).toHaveBeenCalledWith('pay_rzp1', { amount: 5000000 });

    expect(mockMarkRefunded).toHaveBeenCalledWith(
      'payment-1',
      expect.objectContaining({
        order_id: 'order_1',
        payment_id: 'pay_rzp1',
        refundId: 'refnd_1',
        refundStatus: 'processed',
        refundedByUserId: 'admin-1',
      })
    );

    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'INVOICE',
        entityId: 'inv-1',
        eventType: 'REFUND_PROCESSED',
        description: expect.stringContaining('Refund of 50000 processed for Invoice INV/2026-27/00001'),
        actorUserId: 'admin-1',
      })
    );
    expect(timelineService.recordEvent).toHaveBeenCalledTimes(1);

    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'INVOICE', entityId: 'inv-1', action: 'REFUND_PROCESSED' })
    );

    expect(result).toEqual({ paymentId: 'payment-1', status: 'REFUNDED', refundId: 'refnd_1', refundStatus: 'processed' });
  });

  it('marks an offline payment refunded without a gateway call', async () => {
    mockPaymentFindById.mockResolvedValue({
      ...razorpayPayment,
      method: 'CASH',
      gatewayTransactionId: null,
    });

    const result = await refundPayment('payment-1', 'admin-1');

    expect(mockPaymentRefund).not.toHaveBeenCalled();
    expect(mockMarkRefunded).toHaveBeenCalledWith('payment-1', expect.objectContaining({ refundedByUserId: 'admin-1' }));
    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'REFUND_PROCESSED' })
    );
    expect(result.status).toBe('REFUNDED');
  });

  it('does not mark or record when the gateway refund fails', async () => {
    mockPaymentRefund.mockRejectedValue(new Error('gateway down'));

    await expect(refundPayment('payment-1', 'admin-1')).rejects.toThrow('Refund could not be processed');
    expect(mockMarkRefunded).not.toHaveBeenCalled();
    expect(timelineService.recordEvent).not.toHaveBeenCalled();
    expect(auditService.recordAudit).not.toHaveBeenCalled();
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});
