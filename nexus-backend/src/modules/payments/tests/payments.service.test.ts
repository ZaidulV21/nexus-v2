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

const mockOrdersFetch = jest.fn();
const mockPaymentsFetch = jest.fn();
const mockOrdersCreate = jest.fn();

jest.mock('razorpay', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    orders: {
      create: mockOrdersCreate,
      fetch: mockOrdersFetch,
    },
    payments: {
      fetch: mockPaymentsFetch,
    },
  })),
}));

const mockFindById = jest.fn();
const mockCreate = jest.fn();
const mockSumForInvoice = jest.fn();
const mockFindByGatewayTransactionId = jest.fn();

jest.mock('../../invoice/invoice.repository', () => ({
  invoiceRepository: { findById: (...args: any[]) => mockFindById(...args) },
  paymentRepository: {
    create: (...args: any[]) => mockCreate(...args),
    sumForInvoice: (...args: any[]) => mockSumForInvoice(...args),
    findByGatewayTransactionId: (...args: any[]) => mockFindByGatewayTransactionId(...args),
  },
}));

import { verifyPayment } from '../payments.service';
import { AppError } from '../../../core/errors/AppError';
import { timelineService } from '../../timeline/timeline.service';
import { notificationsService } from '../../notifications/notifications.service';

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
    ).rejects.toThrow('already processed');
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

afterAll(() => {
  jest.restoreAllMocks();
});
