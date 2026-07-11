jest.mock('../notifications.repository', () => ({
  notificationsRepository: {
    createEvent: jest.fn().mockResolvedValue({ id: 'evt1' }),
    createLog: jest.fn().mockResolvedValue({}),
    listLogs: jest.fn(),
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