const mockListForEntity = jest.fn();
const mockFindRecentDuplicate = jest.fn();
const mockCreate = jest.fn();
const mockRecordAudit = jest.fn();

jest.mock('../timeline.repository', () => ({
  timelineRepository: {
    listForEntity: (...args: any[]) => mockListForEntity(...args),
    findRecentDuplicate: (...args: any[]) => mockFindRecentDuplicate(...args),
    create: (...args: any[]) => mockCreate(...args),
  },
}));

jest.mock('../../audit/audit.service', () => ({
  auditService: {
    recordAudit: (...args: any[]) => mockRecordAudit(...args),
  },
}));

import { timelineService } from '../timeline.service';

const makeEvent = (eventType: string, id: string) => ({
  id,
  entityType: 'INVOICE',
  entityId: 'inv-1',
  eventType,
  description: `event ${eventType}`,
  metadata: null,
  actorUserId: null,
  actorRef: null,
  entityRef: null,
  createdAt: new Date(),
});

describe('timelineService.getTimelineFor - client visibility whitelist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns every event for ADMIN viewers, unfiltered', async () => {
    const events = [
      makeEvent('INVOICE_CREATED', 'e-1'),
      makeEvent('RECEIPT_GENERATED', 'e-2'),
      makeEvent('PAYMENT_SUCCESSFUL', 'e-3'),
    ];
    mockListForEntity.mockResolvedValue(events);

    const result = await timelineService.getTimelineFor('INVOICE', 'inv-1', { viewerType: 'ADMIN' });

    expect(mockListForEntity).toHaveBeenCalledWith('INVOICE', 'inv-1');
    expect(result).toHaveLength(3);
  });

  it('keeps only whitelisted customer-facing events for CLIENT viewers', async () => {
    const events = [
      makeEvent('INVOICE_SENT', 'e-1'),
      makeEvent('PAYMENT_SUCCESSFUL', 'e-2'),
      makeEvent('INVOICE_PAID', 'e-3'),
      makeEvent('RECEIPT_AVAILABLE', 'e-4'),
      makeEvent('RECEIPT_SENT', 'e-5'),
      makeEvent('RECEIPT_RESENT', 'e-11'),
      makeEvent('INVOICE_CREATED', 'e-6'),
      makeEvent('INVOICE_RESENT', 'e-7'),
      makeEvent('RECEIPT_GENERATED', 'e-8'),
      makeEvent('RECEIPT_STORED', 'e-9'),
      makeEvent('STATUS_CHANGED', 'e-10'),
      makeEvent('REFUND_PROCESSED', 'e-12'),
    ];
    mockListForEntity.mockResolvedValue(events);

    const result = await timelineService.getTimelineFor('INVOICE', 'inv-1', { viewerType: 'CLIENT' });

    expect(result.map((e) => e.eventType)).toEqual([
      'INVOICE_SENT',
      'PAYMENT_SUCCESSFUL',
      'INVOICE_PAID',
      'RECEIPT_AVAILABLE',
      'RECEIPT_SENT',
      'RECEIPT_RESENT',
      'STATUS_CHANGED',
      'REFUND_PROCESSED',
    ]);
  });

  it('returns an empty timeline when the client entity has only internal events', async () => {
    mockListForEntity.mockResolvedValue([
      makeEvent('RECEIPT_GENERATED', 'e-1'),
      makeEvent('QUOTATION_CREATED', 'e-2'),
      makeEvent('QUOTATIONS_MIGRATED', 'e-3'),
    ]);

    const result = await timelineService.getTimelineFor('CLIENT', 'client-1', { viewerType: 'CLIENT' });

    expect(result).toHaveLength(0);
  });

  it('hides staff quotation actions and internal service events from clients', async () => {
    const events = [
      makeEvent('QUOTATION_CREATED', 'e-1'),
      makeEvent('QUOTATION_APPROVED', 'e-2'),
      makeEvent('QUOTATION_SENT', 'e-3'),
      makeEvent('QUOTATION_ACCEPTED', 'e-4'),
      makeEvent('SERVICE_ADDED', 'e-5'),
      makeEvent('LEAD_CREATED', 'e-6'),
    ];
    mockListForEntity.mockResolvedValue(events);

    const result = await timelineService.getTimelineFor('QUOTATION', 'q-1', { viewerType: 'CLIENT' });

    expect(result.map((e) => e.eventType)).toEqual(['QUOTATION_SENT', 'QUOTATION_ACCEPTED', 'SERVICE_ADDED']);
  });
});

describe('timelineService.recordEvent - idempotency passthrough', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips recording when a recent duplicate exists', async () => {
    mockFindRecentDuplicate.mockResolvedValue({ id: 'existing' });

    const result = await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: 'inv-1',
      eventType: 'PAYMENT_SUCCESSFUL',
      description: 'dup',
    });

    expect(result).toEqual({ id: 'existing' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('records when no duplicate exists', async () => {
    mockFindRecentDuplicate.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'new' });

    const result = await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: 'inv-1',
      eventType: 'PAYMENT_SUCCESSFUL',
      description: 'first',
    });

    expect(mockCreate).toHaveBeenCalledWith({
      entityType: 'INVOICE',
      entityId: 'inv-1',
      eventType: 'PAYMENT_SUCCESSFUL',
      description: 'first',
    });
    expect(result).toEqual({ id: 'new' });
  });

  it('passes the payment dedupeKey to the idempotency guard for payment events', async () => {
    mockFindRecentDuplicate.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'new' });

    const result = await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: 'inv-1',
      eventType: 'PAYMENT_SUCCESSFUL',
      description: 'payment 1',
      dedupeKey: 'pay-1',
    });

    // The dedupe identity for a payment event is (entity, eventType, paymentId):
    // a different payment on the same invoice never matches this key.
    expect(mockFindRecentDuplicate).toHaveBeenCalledWith('INVOICE', 'inv-1', 'PAYMENT_SUCCESSFUL', 60_000, 'pay-1');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: 'pay-1' }));
    expect(result).toEqual({ id: 'new' });
  });

  it('keeps invoice events keyed by entity+eventType (no dedupeKey)', async () => {
    mockFindRecentDuplicate.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'new' });

    await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: 'inv-1',
      eventType: 'INVOICE_SENT',
      description: 'sent',
    });

    expect(mockFindRecentDuplicate).toHaveBeenCalledWith('INVOICE', 'inv-1', 'INVOICE_SENT', 60_000, undefined);
    expect(mockCreate).toHaveBeenCalledWith({
      entityType: 'INVOICE',
      entityId: 'inv-1',
      eventType: 'INVOICE_SENT',
      description: 'sent',
    });
  });
});

describe('timelineService.recordEvent - technical events go to the Audit Log only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['PDF_GENERATED', 'PDF_DOWNLOADED', 'RECEIPT_STORED', 'RECEIPT_PDF_GENERATED', 'WEBHOOK_RECEIVED', 'WEBHOOK_VERIFIED', 'EMAIL_PROVIDER_ACCEPTED', 'RETRY_ATTEMPT', 'INTERNAL_API_CALL'])(
    'routes %s to the Audit Log and never writes it to the timeline',
    async (eventType) => {
      const result = await timelineService.recordEvent({
        entityType: 'INVOICE',
        entityId: 'inv-1',
        eventType,
        description: 'low-level implementation detail',
        actorUserId: 'actor-1',
        metadata: { attempt: 2 },
      });

      expect(mockRecordAudit).toHaveBeenCalledWith({
        entityType: 'INVOICE',
        entityId: 'inv-1',
        action: eventType,
        actorUserId: 'actor-1',
        afterState: { description: 'low-level implementation detail', attempt: 2 },
      });
      expect(result).toBeUndefined();
      expect(mockFindRecentDuplicate).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    }
  );
});
