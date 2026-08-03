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
import type {
  CreateOrderResponse,
  VerifyPaymentResponse,
  RefundPaymentResponse,
  WebhookResult,
  RazorpayWebhookPaymentEntity,
} from './payments.types';

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

// Razorpay webhook signature: HMAC-SHA256 over the RAW request body using the
// dashboard-configured webhook secret (NOT the API key secret). The signature
// is delivered in the X-Razorpay-Signature header.
function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', env.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}

type CapturedInvoice = NonNullable<Awaited<ReturnType<typeof invoiceRepository.findById>>>;

interface RazorpayCaptureInput {
  invoice: CapturedInvoice;
  paymentId: string;
  orderId: string;
  amount: number; // rupees (already converted from paise)
  method: string;
  gatewayStatus: string;
  gatewayMetadata: Record<string, unknown>;
  clientId: string;
  actorUserId: string;
}

// Single transaction that persists a captured Razorpay payment for an invoice.
// Shared by the browser-side verifyPayment flow and the authoritative webhook
// fallback so both produce an identical Payment record, identical balances,
// and identical downstream events. The DB-level UNIQUE index on
// gatewayTransactionId is the source of truth for idempotency: a concurrent
// duplicate surfaces here as a P2002 constraint violation, which callers map
// to their own business response (409 for the browser, a silent ack for the
// webhook) - never a second Payment row.
async function recordRazorpayCapture(tx: Prisma.TransactionClient, input: RazorpayCaptureInput) {
  const grandTotal = Number(input.invoice.grandTotal);
  const paidSoFarAgg = await paymentRepository.sumForInvoice(input.invoice.id, tx);
  const paidSoFar = Number(paidSoFarAgg._sum?.amount ?? 0);
  const outstanding = grandTotal - paidSoFar;

  if (input.amount <= 0) throw new AppError('Invalid payment amount', 400);
  if (input.amount > outstanding) {
    throw new AppError(`Payment of ${input.amount} exceeds outstanding balance of ${outstanding}`, 400);
  }

  const payment = await paymentRepository.create(
    {
      invoiceId: input.invoice.id,
      clientId: input.clientId,
      projectId: input.invoice.projectId,
      amount: input.amount,
      method: input.method,
      status: 'SUCCESS',
      transactionReference: input.paymentId,
      recordedByUserId: input.actorUserId,
      gatewayTransactionId: input.paymentId,
      gatewayMetadata: input.gatewayMetadata as Prisma.InputJsonValue,
    },
    tx,
  );

  const newPaidAmount = paidSoFar + input.amount;
  const newOutstanding = grandTotal - newPaidAmount;
  const displayStatus = computeDisplayStatus(input.invoice.status, newPaidAmount, newOutstanding);

  return { payment, newPaidAmount, newOutstanding, displayStatus };
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
    // Each gateway order is its own initiation; keyed by the gateway order id
    // so a second initiation on the same invoice is not collapsed.
    dedupeKey: order.id,
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
    paymentRecord = await runInTransaction(async (tx) =>
      recordRazorpayCapture(tx, {
        invoice,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount,
        method: 'RAZORPAY',
        gatewayStatus: razorpayPayment.status,
        gatewayMetadata: {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
          signature: razorpay_signature,
          gateway_status: razorpayPayment.status,
        },
        clientId,
        actorUserId: clientId,
      }),
    );
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

  // Audit trail parity with the offline payment path (invoiceService.recordPayment):
  // the same PAYMENT_RECORDED entry with the full Payment record as afterState, so
  // online Razorpay payments carry the payment method, amount, gateway transaction
  // id, acting user, and timestamp in the Audit Log exactly like offline payments.
  await auditService.recordAudit({
    entityType: 'INVOICE',
    entityId: invoice.id,
    action: 'PAYMENT_RECORDED',
    afterState: payment,
    actorUserId: clientId,
  });

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

// Authoritative payment fallback: when the browser callback is lost or the
// client never returns to the portal, the Razorpay webhook records the payment
// itself. It shares the exact transaction + event pipeline with the browser
// path (recordRazorpayCapture + fireTimelineAndNotifications), so whichever
// wins the race produces the same Payment row, timeline, audit, notifications
// and receipt - exactly once. Duplicate deliveries are acknowledged and
// ignored.
//
// HTTP semantics for Razorpay:
//   - 2xx: acknowledged (processed, or deliberately ignored). No retry.
//   - 4xx: rejected (invalid signature / malformed payload). No retry.
//   - 5xx: transient failure (gateway/DB). Razorpay retries with backoff.
export async function handleRazorpayWebhook(
  rawBody: string | Buffer,
  signature: string | undefined,
): Promise<WebhookResult> {
  // 1. Signature verification over the RAW body.
  const body = typeof rawBody === 'string' ? rawBody : rawBody?.toString() ?? '';
  if (!signature || !verifyWebhookSignature(body, signature)) {
    throw new AppError('Invalid webhook signature', 400);
  }

  // 2. Parse the delivery envelope.
  let event: string;
  let paymentEntity: RazorpayWebhookPaymentEntity | undefined;
  try {
    const parsed = JSON.parse(body) as {
      event?: string;
      payload?: { payment?: { entity?: RazorpayWebhookPaymentEntity } };
    };
    event = parsed.event ?? '';
    paymentEntity = parsed.payload?.payment?.entity;
  } catch {
    throw new AppError('Invalid webhook payload', 400);
  }

  // 3. Only payment.captured is actionable; every other event is acknowledged
  //    so Razorpay stops retrying a delivery we will never act on.
  if (event !== 'payment.captured') {
    return { event, processed: false, reason: 'event not handled' };
  }
  const paymentId = paymentEntity?.id;
  const orderId = paymentEntity?.order_id;
  if (!paymentId || !orderId || !paymentEntity) {
    return { event, processed: false, reason: 'payment entity missing id/order_id' };
  }

  // Audit-only delivery trace (WEBHOOK_RECEIVED / WEBHOOK_VERIFIED route to
  // the Audit Log via timelineService; they never reach the business timeline).
  // Non-blocking: a trace failure must never fail the webhook itself.
  timelineService
    .recordEvent({
      entityType: 'PAYMENT',
      entityId: paymentId,
      eventType: 'WEBHOOK_RECEIVED',
      description: `Razorpay webhook ${event} received for payment ${paymentId}`,
      metadata: { orderId, event },
    })
    .catch(() => {});
  timelineService
    .recordEvent({
      entityType: 'PAYMENT',
      entityId: paymentId,
      eventType: 'WEBHOOK_VERIFIED',
      description: `Razorpay webhook signature verified for payment ${paymentId}`,
      metadata: { orderId, event },
    })
    .catch(() => {});

  // 4. Ignore duplicate deliveries: a payment already recorded for this
  //    gateway transaction (by an earlier delivery OR the browser verify) is
  //    acknowledged without any re-processing or side effects.
  const existing = await paymentRepository.findByGatewayTransactionId(paymentId);
  if (existing) {
    return { event, processed: false, paymentId, alreadyProcessed: true };
  }

  // 5. Resolve the invoice from the order notes (the order is authoritative
  //    for attribution; the browser path fetches the same order).
  let order;
  try {
    order = await getRazorpay().orders.fetch(orderId);
  } catch (err) {
    throw new AppError('Could not fetch Razorpay order', 502);
  }
  const invoiceId = order?.notes?.invoiceId;
  if (!invoiceId) {
    return { event, processed: false, paymentId, reason: 'order not attributed to an invoice' };
  }

  const invoice = await invoiceRepository.findById(invoiceId);
  if (!invoice) {
    return { event, processed: false, paymentId, reason: 'invoice not found' };
  }
  if (invoice.status === 'CANCELLED') {
    return { event, processed: false, paymentId, reason: 'invoice cancelled' };
  }

  const clientId = order?.notes?.clientId ?? invoice.clientId;
  const amount = Number(paymentEntity.amount ?? 0) / 100;
  const gatewayStatus = paymentEntity.status ?? 'captured';

  // 6. Persist inside a transaction; concurrent duplicates lose on the UNIQUE
  //    index and are acknowledged, never double-recorded.
  let paymentRecord;
  try {
    paymentRecord = await runInTransaction(async (tx) =>
      recordRazorpayCapture(tx, {
        invoice,
        paymentId,
        orderId,
        amount,
        method: 'RAZORPAY',
        gatewayStatus,
        gatewayMetadata: {
          order_id: orderId,
          payment_id: paymentId,
          gateway_status: gatewayStatus,
          payment_method: paymentEntity.method,
          source: 'WEBHOOK',
        },
        clientId,
        actorUserId: clientId,
      }),
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // A concurrent delivery (or the browser verify) recorded the payment
      // first - acknowledge without side effects.
      return { event, processed: false, paymentId, alreadyProcessed: true };
    }
    throw err;
  }

  // 7. Business side effects run exactly once, only after the payment row
  //    committed - identical to the browser path.
  const { payment, newPaidAmount, newOutstanding } = paymentRecord;
  await fireTimelineAndNotifications(invoice, payment, newPaidAmount, newOutstanding, clientId);

  await auditService.recordAudit({
    entityType: 'INVOICE',
    entityId: invoice.id,
    action: 'PAYMENT_RECORDED',
    afterState: payment,
    actorUserId: clientId,
  });

  return { event, processed: true, paymentId };
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
    dedupeKey: paymentId,
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
    dedupeKey: payment.id,
  });

  // 2. Invoice fully paid (or partially) - only after the payment is recorded.
  if (newOutstanding > 0) {
    await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: invoice.id,
      eventType: 'PARTIAL_PAYMENT',
      description: `Partial payment of ${amount} received. Outstanding: ${newOutstanding}`,
      actorUserId: clientId,
      dedupeKey: payment.id,
    });
  } else {
    await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: invoice.id,
      eventType: 'INVOICE_PAID',
      description: `Invoice fully paid. Total paid: ${newPaidAmount}`,
      actorUserId: clientId,
      dedupeKey: payment.id,
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

  // payment.successful is a BUSINESS event only: payment recording, invoice
  // updates, timeline, audit, and in-app notifications. No email is sent for
  // it - the SINGLE automatic receipt email is the payment.receipt_available
  // event below.
  notificationsService.emitEvent({
    eventType: 'payment.successful',
    entityType: 'INVOICE',
    entityId: invoice.id,
    recipient: recipientEmail,
    payload,
    dedupeKey: payment.id,
    sendEmail: false,
  }).catch(() => {});

  // The single automatic receipt email (renders payment-receipt.template).
  // receiptSentAt is set ONLY when the email provider actually accepted the
  // message (emailStatus === 'SENT'), so a delivery failure leaves
  // receiptSentAt NULL and a later manual sendReceipt still records
  // RECEIPT_SENT - never a phantom RECEIPT_RESENT. Fire-and-forget so an email
  // hiccup never fails the payment confirmation; the in-app "receipt
  // available" notification above/below is idempotent via the receipt PDF.
  notificationsService.emitEvent({
    eventType: 'payment.receipt_available',
    entityType: 'INVOICE',
    entityId: invoice.id,
    recipient: recipientEmail,
    payload,
    dedupeKey: payment.id,
  })
    .then((result) => {
      if (result?.emailStatus === 'SENT') {
        return paymentRepository.markReceiptSent(payment.id);
      }
    })
    .catch(() => {});
}
