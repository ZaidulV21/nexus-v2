import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import Razorpay from 'razorpay';
import { env } from '../../config/env';
import { invoiceRepository, paymentRepository } from '../invoice/invoice.repository';
import { timelineService } from '../timeline/timeline.service';
import { notificationsService } from '../notifications/notifications.service';
import { auditService } from '../audit/audit.service';
import { runInTransaction } from '../../core/utils/transaction';
import { AppError, NotFoundError } from '../../core/errors/AppError';
import type { CreateOrderResponse, VerifyPaymentResponse, RefundPaymentResponse } from './payments.types';

let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret: env.razorpayKeySecret,
    });
  }
  return razorpayInstance;
}

function computeOutstanding(invoice: Awaited<ReturnType<typeof invoiceRepository.findById>>): number {
  if (!invoice) return 0;
  const grandTotal = Number(invoice.grandTotal);
  const paidAmount = (invoice.payments ?? [])
    .filter((p: any) => !p.status || p.status === 'SUCCESS')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  return invoice.status === 'CANCELLED' ? 0 : grandTotal - paidAmount;
}

function computeDisplayStatus(invoiceStatus: string, paidAmount: number, outstanding: number): string {
  if (invoiceStatus === 'CANCELLED') return 'CANCELLED';
  if (outstanding <= 0) return 'PAID';
  if (paidAmount > 0) return 'PARTIALLY PAID';
  return 'SENT';
}

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

export async function createRazorpayOrder(
  invoiceId: string,
  clientId: string,
): Promise<CreateOrderResponse> {
  const invoice = await invoiceRepository.findById(invoiceId);
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (invoice.clientId !== clientId) throw new NotFoundError('Invoice not found');

  const outstanding = computeOutstanding(invoice);
  const amountPaise = Math.round(outstanding * 100);

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `INV-${invoice.invoiceNumber}`,
    notes: { invoiceId: invoice.id, clientId },
  });

  timelineService.recordEvent({
    entityType: 'INVOICE',
    entityId: invoice.id,
    eventType: 'PAYMENT_INITIATED',
    description: `Payment initiated for Invoice ${invoice.invoiceNumber}`,
    actorUserId: clientId,
  }).catch(() => {});

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: env.razorpayKeyId,
    receipt: order.receipt,
  };
}

export async function verifyPayment(
  input: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string },
  clientId: string,
): Promise<VerifyPaymentResponse> {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = input;

  if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    throw new AppError('Invalid payment signature', 400);
  }

  const existing = await paymentRepository.findByGatewayTransactionId(razorpay_payment_id);
  if (existing) {
    throw new AppError('Payment already processed', 409);
  }

  const razorpay = getRazorpay();
  const order = await razorpay.orders.fetch(razorpay_order_id);
  const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);

  const invoiceId = order.notes?.invoiceId;
  if (!invoiceId) throw new AppError('Razorpay order missing invoice reference', 400);

  const amount = razorpayPayment.amount / 100;

  const invoice = await invoiceRepository.findById(invoiceId);
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (invoice.clientId !== clientId) throw new NotFoundError('Invoice not found');
  if (invoice.status === 'CANCELLED') {
    throw new AppError('Cannot record payment against a cancelled invoice', 400);
  }

  // The application-level pre-check above stops the common duplicate, but two
  // concurrent verification requests can both pass it before either commits.
  // The DB-level UNIQUE index on gatewayTransactionId is the source of truth:
  // the loser surfaces as a P2002 constraint violation, which is mapped to the
  // same clean business error instead of a second Payment row.
  let paymentRecord;
  try {
    paymentRecord = await runInTransaction(async (tx) => {

      const grandTotal = Number(invoice.grandTotal);
      const paidSoFarAgg = await paymentRepository.sumForInvoice(invoiceId, tx);
      const paidSoFar = Number(paidSoFarAgg._sum?.amount ?? 0);
      const outstanding = grandTotal - paidSoFar;

      if (amount <= 0) throw new AppError('Invalid payment amount', 400);
      if (amount > outstanding) {
        throw new AppError(`Payment of ${amount} exceeds outstanding balance of ${outstanding}`, 400);
      }

      const payment = await paymentRepository.create(
        {
          invoiceId,
          clientId,
          projectId: invoice.projectId,
          amount,
          method: 'RAZORPAY',
          status: 'SUCCESS',
          transactionReference: razorpay_payment_id,
          recordedByUserId: clientId,
          gatewayTransactionId: razorpay_payment_id,
          gatewayMetadata: {
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
            signature: razorpay_signature,
            gateway_status: razorpayPayment.status,
          },
        },
        tx,
      );

      const newPaidAmount = paidSoFar + amount;
      const newOutstanding = grandTotal - newPaidAmount;
      const displayStatus = computeDisplayStatus(invoice.status, newPaidAmount, newOutstanding);

      return { payment, newPaidAmount, newOutstanding, displayStatus };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError('Payment already processed', 409);
    }
    throw err;
  }

  const { payment, newPaidAmount, newOutstanding, displayStatus } = paymentRecord;

  // Timeline + notification pipeline. Business events are recorded strictly in
  // the order they happened (the payment is persisted by the transaction above
  // before any of these fire), so the invoice timeline never reads "Invoice
  // Fully Paid" before "Payment Received".
  await fireTimelineAndNotifications(invoice, payment, newPaidAmount, newOutstanding, clientId);

  return {
    payment: {
      id: payment.id,
      amount,
      method: 'RAZORPAY',
      status: 'SUCCESS',
      gatewayTransactionId: razorpay_payment_id,
      paidAt: payment.paidAt.toISOString(),
    },
    invoice: {
      id: invoice.id,
      paidAmount: newPaidAmount,
      outstandingAmount: newOutstanding,
      displayStatus,
    },
  };
}

export async function refundPayment(paymentId: string, actorUserId: string): Promise<RefundPaymentResponse> {
  const payment = await paymentRepository.findById(paymentId);
  if (!payment) throw new NotFoundError('Payment not found');
  if (payment.status !== 'SUCCESS') {
    throw new AppError('Only successful payments can be refunded', 400);
  }

  const invoice = await invoiceRepository.findById(payment.invoiceId);
  if (!invoice) throw new NotFoundError('Invoice not found');

  let refundId: string | undefined;
  let refundStatus: string | undefined;

  // Gateway refund first (truthful: the timeline only says "Refund Processed"
  // after the money movement is actually requested from the gateway). Offline
  // / non-Razorpay payments are marked refunded without a gateway call.
  if (payment.method === 'RAZORPAY' && payment.gatewayTransactionId) {
    try {
      const refund = await getRazorpay().payments.refund(payment.gatewayTransactionId, {
        amount: Math.round(Number(payment.amount) * 100),
      });
      refundId = refund.id;
      refundStatus = refund.status ?? 'REFUNDED';
    } catch (err) {
      throw new AppError('Refund could not be processed by the payment gateway', 502);
    }
  }

  await paymentRepository.markRefunded(paymentId, {
    ...(payment.gatewayMetadata as Record<string, unknown> | undefined),
    refundId,
    refundStatus,
    refundedAt: new Date().toISOString(),
    refundedByUserId: actorUserId,
  });

  await timelineService.recordEvent({
    entityType: 'INVOICE',
    entityId: payment.invoiceId,
    eventType: 'REFUND_PROCESSED',
    description: `Refund of ${payment.amount} processed for Invoice ${invoice.invoiceNumber}`,
    actorUserId,
    metadata: { paymentId, refundId, refundStatus },
  });

  await auditService.recordAudit({
    entityType: 'INVOICE',
    entityId: payment.invoiceId,
    action: 'REFUND_PROCESSED',
    afterState: { paymentId, refundId, refundStatus, amount: payment.amount },
    actorUserId,
  });

  return { paymentId, status: 'REFUNDED', refundId, refundStatus };
}

async function fireTimelineAndNotifications(
  invoice: NonNullable<Awaited<ReturnType<typeof invoiceRepository.findById>>>,
  payment: { id: string; amount: number | { toString(): string }; paidAt: Date | string },
  newPaidAmount: number,
  newOutstanding: number,
  clientId: string,
) {
  const amount = Number(payment.amount);
  const paidAt = payment.paidAt instanceof Date ? payment.paidAt : new Date(payment.paidAt);

  // 1. Payment received. A payment cannot fully pay an invoice before it is
  // recorded, so this event is always awaited and written FIRST.
  await timelineService.recordEvent({
    entityType: 'INVOICE',
    entityId: invoice.id,
    eventType: 'PAYMENT_SUCCESSFUL',
    description: `Payment of ${amount} received via Razorpay for Invoice ${invoice.invoiceNumber}`,
    actorUserId: clientId,
  });

  // 2. Invoice fully paid (or partially) - only after the payment is recorded.
  if (newOutstanding > 0) {
    await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: invoice.id,
      eventType: 'PARTIAL_PAYMENT',
      description: `Partial payment of ${amount} received. Outstanding: ${newOutstanding}`,
      actorUserId: clientId,
    });
  } else {
    await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: invoice.id,
      eventType: 'INVOICE_PAID',
      description: `Invoice fully paid. Total paid: ${newPaidAmount}`,
      actorUserId: clientId,
    });
  }

  // 3. Receipt generated -> stored -> available. The receipt PDF is rendered
  // and stored immediately so the client can view/download it in the portal.
  // pdf.service records the receipt lifecycle milestones itself (exactly once,
  // on the first generation of the receipt); a render failure must never fail
  // the payment confirmation, so this stays non-blocking and failure-safe.
  import('../pdf/pdf.service').then(({ pdfService }) => {
    pdfService.generateReceipt(payment.id, clientId).catch(() => {});
  });

  // 4. Notifications (email + in-app), fire-and-forget.
  const recipientEmail = invoice.client?.email;
  if (!recipientEmail) return;

  const payload = {
    amount,
    invoiceNumber: invoice.invoiceNumber,
    clientId,
    invoiceId: invoice.id,
    paymentId: payment.id,
    paymentMethod: 'RAZORPAY',
    paymentDate: paidAt.toISOString(),
  };

  notificationsService.emitEvent({
    eventType: 'payment.successful',
    entityType: 'INVOICE',
    entityId: invoice.id,
    recipient: recipientEmail,
    payload,
  }).catch(() => {});

  // Client-facing notification that a receipt is available (idempotent via
  // the receipt PDF itself); this is separate from the receipt EMAIL, which
  // is only ever sent on-demand or via the sendReceipt flow.
  notificationsService.emitEvent({
    eventType: 'payment.receipt_available',
    entityType: 'INVOICE',
    entityId: invoice.id,
    recipient: recipientEmail,
    payload,
  }).catch(() => {});
}
