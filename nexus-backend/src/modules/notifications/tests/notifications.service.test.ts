jest.mock('../notifications.repository', () => ({
  notificationsRepository: {
    createEvent: jest.fn().mockResolvedValue({ id: 'evt1' }),
    createLog: jest.fn().mockResolvedValue({}),
    listLogs: jest.fn(),
    createInAppNotification: jest.fn().mockResolvedValue({ id: 'notif1' }),
    createManyInAppNotifications: jest.fn().mockResolvedValue({ count: 0 }),
    listByRecipient: jest.fn().mockResolvedValue([]),
    countByRecipient: jest.fn().mockResolvedValue(0),
    countUnread: jest.fn().mockResolvedValue(0),
    markAsRead: jest.fn().mockResolvedValue({ count: 0 }),
    markAllAsRead: jest.fn().mockResolvedValue({ count: 0 }),
    findAllAdminUserIds: jest.fn().mockResolvedValue([{ id: 'admin1' }, { id: 'admin2' }]),
  },
}));
jest.mock('../notifications.dispatcher', () => ({
  notificationsDispatcher: { dispatch: jest.fn() },
}));

import { notificationsRepository } from '../notifications.repository';
import { notificationsDispatcher } from '../notifications.dispatcher';
import { notificationsService } from '../notifications.service';

describe('notificationsService.emitEvent', () => {
  it('dispatches a known event and logs success', async () => {
    (notificationsDispatcher.dispatch as jest.Mock).mockResolvedValue(undefined);
    await notificationsService.emitEvent({
      eventType: 'quotation.sent',
      payload: { quotationId: 'q1' },
      recipient: 'client@nexus.test',
    });
    expect(notificationsRepository.createEvent).toHaveBeenCalled();
    expect(notificationsRepository.createLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SENT' })
    );
  });

  it('logs a failure without throwing when the channel fails', async () => {
    (notificationsDispatcher.dispatch as jest.Mock).mockRejectedValue(new Error('smtp down'));
    await expect(
      notificationsService.emitEvent({
        eventType: 'quotation.sent',
        payload: {},
        recipient: 'client@nexus.test',
      })
    ).resolves.not.toThrow();
    expect(notificationsRepository.createLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILED' })
    );
  });

  it('ignores unknown event types without dispatching', async () => {
    (notificationsDispatcher.dispatch as jest.Mock).mockClear();
    await notificationsService.emitEvent({
      eventType: 'not.a.real.event',
      payload: {},
      recipient: 'x@nexus.test',
    });
    expect(notificationsDispatcher.dispatch).not.toHaveBeenCalled();
  });
});

describe('notificationsService - in-app notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (notificationsDispatcher.dispatch as jest.Mock).mockResolvedValue(undefined);
    (notificationsRepository.findAllAdminUserIds as jest.Mock).mockResolvedValue([
      { id: 'admin1' },
      { id: 'admin2' },
    ]);
  });

  it('creates admin in-app notifications for lead.created', async () => {
    await notificationsService.emitEvent({
      eventType: 'lead.created',
      entityType: 'LEAD',
      entityId: 'lead-123',
      payload: { leadNumber: 'L-00001' },
      recipient: 'admin-inbox',
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(notificationsRepository.createManyInAppNotifications).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          recipientId: 'admin1',
          recipientType: 'ADMIN',
          title: 'New lead created',
          relatedEntity: 'LEAD',
          relatedEntityId: 'lead-123',
        }),
        expect.objectContaining({
          recipientId: 'admin2',
          recipientType: 'ADMIN',
          title: 'New lead created',
        }),
      ])
    );
  });

  it('creates both admin and client in-app notifications for project.created', async () => {
    await notificationsService.emitEvent({
      eventType: 'project.created',
      entityType: 'PROJECT',
      entityId: 'proj-123',
      payload: { projectNumber: 'PRJ-00001', clientId: 'client-abc' },
      recipient: 'admin-inbox',
    });

    await new Promise((r) => setTimeout(r, 10));

    const call = (notificationsRepository.createManyInAppNotifications as jest.Mock).mock.calls[0][0];
    const adminNotifs = call.filter((n: any) => n.recipientType === 'ADMIN');
    const clientNotifs = call.filter((n: any) => n.recipientType === 'CLIENT');

    expect(adminNotifs.length).toBeGreaterThanOrEqual(1);
    expect(adminNotifs[0]).toMatchObject({
      recipientId: 'admin1',
      recipientType: 'ADMIN',
      title: 'Project created',
    });
    expect(clientNotifs.length).toBe(1);
    expect(clientNotifs[0]).toMatchObject({
      recipientId: 'client-abc',
      recipientType: 'CLIENT',
      title: 'Your project has been created',
    });
  });

  it('creates client in-app notification for quotation.sent with clientId', async () => {
    await notificationsService.emitEvent({
      eventType: 'quotation.sent',
      entityType: 'QUOTATION',
      entityId: 'q-123',
      payload: { quotationNumber: 'Q-00001', clientId: 'client-xyz' },
      recipient: 'client@nexus.test',
    });

    await new Promise((r) => setTimeout(r, 10));

    const call = (notificationsRepository.createManyInAppNotifications as jest.Mock).mock.calls[0][0];
    const clientNotifs = call.filter((n: any) => n.recipientType === 'CLIENT');
    expect(clientNotifs.length).toBe(1);
    expect(clientNotifs[0]).toMatchObject({
      recipientId: 'client-xyz',
      recipientType: 'CLIENT',
      title: 'New quotation available',
    });
  });

  it('creates admin-only in-app notification for quotation.revision_requested', async () => {
    await notificationsService.emitEvent({
      eventType: 'quotation.revision_requested',
      entityType: 'QUOTATION',
      entityId: 'q-456',
      payload: { quotationNumber: 'Q-00002', reason: 'Price too high' },
      recipient: 'admin-inbox',
    });

    await new Promise((r) => setTimeout(r, 10));

    const call = (notificationsRepository.createManyInAppNotifications as jest.Mock).mock.calls[0][0];
    const clientNotifs = call.filter((n: any) => n.recipientType === 'CLIENT');
    expect(clientNotifs.length).toBe(0);
  });

  it('does not create in-app notifications for unknown event types', async () => {
    (notificationsDispatcher.dispatch as jest.Mock).mockClear();
    await notificationsService.emitEvent({
      eventType: 'not.a.real.event',
      payload: {},
      recipient: 'x@nexus.test',
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(notificationsRepository.createManyInAppNotifications).not.toHaveBeenCalled();
  });
});

describe('notificationsService - CRUD operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getUnreadCount delegates to repository', async () => {
    (notificationsRepository.countUnread as jest.Mock).mockResolvedValue(5);
    const count = await notificationsService.getUnreadCount('user-1', 'ADMIN');
    expect(count).toBe(5);
    expect(notificationsRepository.countUnread).toHaveBeenCalledWith('user-1', 'ADMIN');
  });

  it('markAsRead delegates to repository with id and recipientId', async () => {
    (notificationsRepository.markAsRead as jest.Mock).mockResolvedValue({ count: 1 });
    const result = await notificationsService.markAsRead('notif-1', 'user-1');
    expect(result).toEqual({ count: 1 });
    expect(notificationsRepository.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
  });

  it('markAllAsRead delegates to repository', async () => {
    (notificationsRepository.markAllAsRead as jest.Mock).mockResolvedValue({ count: 3 });
    const result = await notificationsService.markAllAsRead('user-1', 'ADMIN');
    expect(result).toEqual({ count: 3 });
    expect(notificationsRepository.markAllAsRead).toHaveBeenCalledWith('user-1', 'ADMIN');
  });

  it('listByRecipient returns items and total', async () => {
    const mockItems = [{ id: 'n1', title: 'Test' }];
    (notificationsRepository.listByRecipient as jest.Mock).mockResolvedValue(mockItems);
    (notificationsRepository.countByRecipient as jest.Mock).mockResolvedValue(1);
    const result = await notificationsService.listByRecipient({
      recipientId: 'user-1',
      recipientType: 'ADMIN',
      page: 1,
      pageSize: 20,
    });
    expect(result.items).toEqual(mockItems);
    expect(result.total).toBe(1);
  });

  it('listByRecipient filters by isRead when provided', async () => {
    (notificationsRepository.listByRecipient as jest.Mock).mockResolvedValue([]);
    (notificationsRepository.countByRecipient as jest.Mock).mockResolvedValue(0);
    await notificationsService.listByRecipient({
      recipientId: 'user-1',
      recipientType: 'CLIENT',
      isRead: false,
      page: 1,
      pageSize: 10,
    });
    expect(notificationsRepository.listByRecipient).toHaveBeenCalledWith(
      expect.objectContaining({ isRead: false })
    );
  });
});
