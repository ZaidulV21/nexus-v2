import crypto from 'crypto';

const TEST_RAZORPAY_SECRET = 'rzp_test_secret';
const TEST_RAZORPAY_WEBHOOK_SECRET = 'rzp_test_webhook_secret';

jest.mock('../../../config/env', () => ({
  env: {
    razorpayKeyId: 'rzp_test_key',
    razorpayKeySecret: TEST_RAZORPAY_SECRET,
    razorpayWebhookSecret: TEST_RAZORPAY_WEBHOOK_SECRET,
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
const mockMarkReceiptSent = jest.fn();

jest.mock('../../invoice/invoice.repository', () => ({
  invoiceRepository: { findById: (...args: any[]) => mockFindById(...args) },
  paymentRepository: {
    create: (...args: any[]) => mockCreate(...args),
    sumForInvoice: (...args: any[]) => mockSumForInvoice(...args),
    findByGatewayTransactionId: (...args: any[]) => mockFindByGatewayTransactionId(...args),
    findById: (...args: any[]) => mockPaymentFindById(...args),
    markRefunded: (...args: any[]) => mockMarkRefunded(...args),
    markReceiptSent: (...args: any[]) => mockMarkReceiptSent(...args),
  },
}));

import { verifyPayment, refundPayment, handleRazorpayWebhook } from '../payments.service';
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
    expect(auditService.recordAudit).not.toHaveBeenCalled();
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
    expect(auditService.recordAudit).toHaveBeenCalledTimes(1); // exactly one PAYMENT_RECORDED entry
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
      expect.objectContaining({ eventType: 'PAYMENT_SUCCESSFUL', dedupeKey: 'payment-1' })
    );
    expect(notificationsService.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'payment.successful',
        dedupeKey: 'payment-1',
        sendEmail: false,
        payload: expect.objectContaining({ paymentId: 'payment-1', invoiceId: 'inv-1', paymentMethod: 'RAZORPAY' }),
      })
    );
    expect(notificationsService.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'payment.receipt_available', dedupeKey: 'payment-1' })
    );

    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'PARTIAL_PAYMENT', dedupeKey: 'payment-1' })
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

    // The single automatic receipt email (payment.receipt_available) succeeded,
    // so receiptSentAt is stamped - and only then.
    expect(mockMarkReceiptSent).toHaveBeenCalledWith('payment-1');
  });

  it('records the same PAYMENT_RECORDED audit entry as the offline payment path', async () => {
    const sig = generateSignature(orderId, paymentId);
    mockCreate.mockResolvedValue({
      id: 'payment-1',
      amount: 50000,
      method: 'RAZORPAY',
      status: 'SUCCESS',
      recordedByUserId: 'client-1',
      transactionReference: paymentId,
      gatewayTransactionId: paymentId,
      paidAt: new Date('2026-07-31T12:00:00Z'),
    });

    await verifyPayment(
      { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: sig },
      'client-1',
    );

    // Offline recordPayment calls auditService.recordAudit({ entityType:
    // 'INVOICE', entityId, action: 'PAYMENT_RECORDED', afterState: payment,
    // actorUserId }). The online path must produce the exact same trail, with
    // the gateway transaction id carried in the afterState.
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'INVOICE',
        entityId: 'inv-1',
        action: 'PAYMENT_RECORDED',
        actorUserId: 'client-1',
        afterState: expect.objectContaining({
          id: 'payment-1',
          amount: 50000,
          method: 'RAZORPAY',
          status: 'SUCCESS',
          recordedByUserId: 'client-1',
          gatewayTransactionId: paymentId,
        }),
      })
    );
    expect(auditService.recordAudit).toHaveBeenCalledTimes(1);
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

  it('records one event set PER PAYMENT when two payments hit the same invoice', async () => {
    // Two distinct gateway transactions on the SAME invoice, both inside the
    // dedupe window. Each must produce its own timeline + notification events.
    const pay1 = 'pay_Pay1Retry7AbF2u';
    const pay2 = 'pay_Pay2LgWY8AbF2u';
    const order1 = 'order_Oq7aJfVX7ZyE1a';
    const order2 = 'order_Oq7aJfVX7ZyE1b';

    (timelineService.recordEvent as jest.Mock).mockResolvedValue({});
    (notificationsService.emitEvent as jest.Mock).mockResolvedValue({ emailStatus: 'SENT' });

    mockFindByGatewayTransactionId.mockResolvedValue(null);
    mockFindById.mockResolvedValue(mockInvoice);
    mockOrdersFetch
      .mockResolvedValueOnce({ id: order1, notes: { invoiceId: 'inv-1' } })
      .mockResolvedValueOnce({ id: order2, notes: { invoiceId: 'inv-1' } });
    mockPaymentsFetch
      .mockResolvedValueOnce({ id: pay1, amount: 3000000, status: 'captured' })
      .mockResolvedValueOnce({ id: pay2, amount: 2000000, status: 'captured' });
    mockSumForInvoice
      .mockResolvedValueOnce({ _sum: { amount: 0 } })
      .mockResolvedValueOnce({ _sum: { amount: 30000 } });
    mockCreate
      .mockResolvedValueOnce({
        id: 'payment-1',
        amount: 30000,
        method: 'RAZORPAY',
        status: 'SUCCESS',
        gatewayTransactionId: pay1,
        paidAt: new Date('2026-07-31T12:00:00Z'),
      })
      .mockResolvedValueOnce({
        id: 'payment-2',
        amount: 20000,
        method: 'RAZORPAY',
        status: 'SUCCESS',
        gatewayTransactionId: pay2,
        paidAt: new Date('2026-07-31T12:00:01Z'),
      });

    const sig1 = generateSignature(order1, pay1);
    const sig2 = generateSignature(order2, pay2);

    await verifyPayment(
      { razorpay_payment_id: pay1, razorpay_order_id: order1, razorpay_signature: sig1 },
      'client-1',
    );
    await verifyPayment(
      { razorpay_payment_id: pay2, razorpay_order_id: order2, razorpay_signature: sig2 },
      'client-1',
    );

    // Timeline: both payments produce PAYMENT_SUCCESSFUL, each keyed by its own
    // payment id so the dedupe guard cannot collapse them.
    const successEvents = (timelineService.recordEvent as jest.Mock).mock.calls
      .map((c) => c[0])
      .filter((ev: any) => ev.eventType === 'PAYMENT_SUCCESSFUL');
    expect(successEvents).toHaveLength(2);
    expect(successEvents.map((ev: any) => ev.dedupeKey).sort()).toEqual(['payment-1', 'payment-2']);

    // Notifications: both payments produce payment.successful + receipt events,
    // keyed by their own payment id.
    const successNotifs = (notificationsService.emitEvent as jest.Mock).mock.calls
      .map((c) => c[0])
      .filter((ev: any) => ev.eventType === 'payment.successful');
    expect(successNotifs).toHaveLength(2);
    expect(successNotifs.map((ev: any) => ev.dedupeKey).sort()).toEqual(['payment-1', 'payment-2']);

    const receiptNotifs = (notificationsService.emitEvent as jest.Mock).mock.calls
      .map((c) => c[0])
      .filter((ev: any) => ev.eventType === 'payment.receipt_available');
    expect(receiptNotifs).toHaveLength(2);
    expect(receiptNotifs.map((ev: any) => ev.dedupeKey).sort()).toEqual(['payment-1', 'payment-2']);

    // Audit: one PAYMENT_RECORDED entry PER payment, each carrying its own
    // gateway transaction id - identical to the offline multi-payment trail.
    const auditEntries = (auditService.recordAudit as jest.Mock).mock.calls
      .map((c) => c[0])
      .filter((ev: any) => ev.action === 'PAYMENT_RECORDED');
    expect(auditEntries).toHaveLength(2);
    expect(auditEntries.map((ev: any) => (ev.afterState as any).gatewayTransactionId).sort()).toEqual([pay1, pay2]);

    // Each successful receipt email stamps its OWN payment's receiptSentAt.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockMarkReceiptSent.mock.calls.map((c) => c[0]).sort()).toEqual(['payment-1', 'payment-2']);
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

describe('handleRazorpayWebhook', () => {
  const webhookInvoice = {
    id: 'inv-1',
    status: 'ISSUED',
    grandTotal: 100000,
    invoiceNumber: 'INV/2026-27/00001',
    clientId: 'client-1',
    projectId: 'proj-1',
    client: { email: 'client@test.com' },
  };

  const webhookOrderId = 'order_WebhookVX7ZyE1a';
  const webhookPaymentId = 'pay_WebhookLgWY8AbF2';

  function buildBody(event: string, entity: Record<string, unknown>): string {
    return JSON.stringify({ entity: 'event', event, payload: { payment: { entity } } });
  }

  function sign(body: string): string {
    return crypto.createHmac('sha256', TEST_RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
  }

  function capturedEntity(overrides: Record<string, unknown> = {}) {
    return {
      id: webhookPaymentId,
      entity: 'payment',
      order_id: webhookOrderId,
      amount: 5000000,
      currency: 'INR',
      status: 'captured',
      method: 'upi',
      ...overrides,
    };
  }

  function paymentSideEffectTypes(): string[] {
    return (timelineService.recordEvent as jest.Mock)
      .mock.calls.map((c) => (c[0] as { eventType?: string }).eventType)
      .filter((t): t is string => !!t && t !== 'WEBHOOK_RECEIVED' && t !== 'WEBHOOK_VERIFIED');
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockFindByGatewayTransactionId.mockResolvedValue(null);
    mockFindById.mockResolvedValue(webhookInvoice);
    mockSumForInvoice.mockResolvedValue({ _sum: { amount: 0 } });
    mockOrdersFetch.mockResolvedValue({
      id: webhookOrderId,
      notes: { invoiceId: 'inv-1', clientId: 'client-1' },
    });
    mockCreate.mockResolvedValue({
      id: 'payment-1',
      amount: 50000,
      method: 'RAZORPAY',
      status: 'SUCCESS',
      gatewayTransactionId: webhookPaymentId,
      paidAt: new Date('2026-07-31T12:00:00Z'),
    });
  });

  it('rejects an invalid or missing signature', async () => {
    const body = buildBody('payment.captured', capturedEntity());

    await expect(handleRazorpayWebhook(body, 'forged_signature')).rejects.toMatchObject({
      message: /Invalid webhook signature/i,
      statusCode: 400,
    });
    await expect(handleRazorpayWebhook(body, undefined)).rejects.toMatchObject({
      message: /Invalid webhook signature/i,
      statusCode: 400,
    });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockOrdersFetch).not.toHaveBeenCalled();
  });

  it('verifies the signature over the exact raw bytes (a tampered body is rejected)', async () => {
    const body = buildBody('payment.captured', capturedEntity());
    const tampered = body.replace('"status":"captured"', '"status":"captured "');

    await expect(handleRazorpayWebhook(tampered, sign(body))).rejects.toMatchObject({ statusCode: 400 });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('acknowledges events other than payment.captured without processing them', async () => {
    const body = buildBody('payment.failed', capturedEntity({ status: 'failed' }));

    const result = await handleRazorpayWebhook(body, sign(body));

    expect(result).toMatchObject({ event: 'payment.failed', processed: false, reason: 'event not handled' });
    expect(mockOrdersFetch).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(timelineService.recordEvent).not.toHaveBeenCalled();
  });

  it('records a payment.captured once: payment row + timeline + audit + receipt', async () => {
    const body = buildBody('payment.captured', capturedEntity());

    const result = await handleRazorpayWebhook(body, sign(body));

    expect(result).toMatchObject({ event: 'payment.captured', processed: true, paymentId: webhookPaymentId });

    expect(mockFindByGatewayTransactionId).toHaveBeenCalledWith(webhookPaymentId);
    expect(mockOrdersFetch).toHaveBeenCalledWith(webhookOrderId);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: 'inv-1',
        clientId: 'client-1',
        amount: 50000,
        method: 'RAZORPAY',
        status: 'SUCCESS',
        gatewayTransactionId: webhookPaymentId,
        gatewayMetadata: expect.objectContaining({ source: 'WEBHOOK', payment_method: 'upi' }),
      }),
      expect.anything()
    );

    expect(paymentSideEffectTypes()).toEqual(expect.arrayContaining(['PAYMENT_SUCCESSFUL']));
    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'PAYMENT_SUCCESSFUL', dedupeKey: 'payment-1' })
    );
    expect(notificationsService.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'payment.receipt_available', dedupeKey: 'payment-1' })
    );
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'INVOICE', entityId: 'inv-1', action: 'PAYMENT_RECORDED' })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pdfService.generateReceipt).toHaveBeenCalledWith('payment-1', 'client-1');
    expect(mockMarkReceiptSent).toHaveBeenCalledWith('payment-1');
  });

  it('acks a duplicate delivery already recorded (by an earlier delivery or the browser verify) with no side effects', async () => {
    mockFindByGatewayTransactionId.mockResolvedValue({
      id: 'existing-pay',
      gatewayTransactionId: webhookPaymentId,
    });

    const body = buildBody('payment.captured', capturedEntity());
    const result = await handleRazorpayWebhook(body, sign(body));

    expect(result).toMatchObject({ processed: false, paymentId: webhookPaymentId, alreadyProcessed: true });
    expect(mockOrdersFetch).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(paymentSideEffectTypes()).toHaveLength(0);
    expect(auditService.recordAudit).not.toHaveBeenCalled();
  });

  it('acks a concurrent duplicate that loses the DB unique-constraint race (P2002)', async () => {
    mockCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on gatewayTransactionId', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['gatewayTransactionId'] },
      })
    );

    const body = buildBody('payment.captured', capturedEntity());
    const result = await handleRazorpayWebhook(body, sign(body));

    expect(result).toMatchObject({ processed: false, paymentId: webhookPaymentId, alreadyProcessed: true });
    expect(paymentSideEffectTypes()).toHaveLength(0);
    expect(auditService.recordAudit).not.toHaveBeenCalled();
    expect(notificationsService.emitEvent).not.toHaveBeenCalled();
  });

  it('acks a delivery whose order is not attributed to an invoice', async () => {
    mockOrdersFetch.mockResolvedValue({ id: webhookOrderId, notes: {} });

    const body = buildBody('payment.captured', capturedEntity());
    const result = await handleRazorpayWebhook(body, sign(body));

    expect(result).toMatchObject({ processed: false, paymentId: webhookPaymentId, reason: 'order not attributed to an invoice' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('acks a delivery for an unknown invoice', async () => {
    mockFindById.mockResolvedValue(null);

    const body = buildBody('payment.captured', capturedEntity());
    const result = await handleRazorpayWebhook(body, sign(body));

    expect(result).toMatchObject({ processed: false, paymentId: webhookPaymentId, reason: 'invoice not found' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('acks a delivery for a cancelled invoice', async () => {
    mockFindById.mockResolvedValue({ ...webhookInvoice, status: 'CANCELLED' });

    const body = buildBody('payment.captured', capturedEntity());
    const result = await handleRazorpayWebhook(body, sign(body));

    expect(result).toMatchObject({ processed: false, paymentId: webhookPaymentId, reason: 'invoice cancelled' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a malformed JSON payload', async () => {
    await expect(handleRazorpayWebhook('not json at all', sign('not json at all'))).rejects.toMatchObject({
      message: /Invalid webhook payload/i,
      statusCode: 400,
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});
