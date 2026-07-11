jest.mock('../conversation.repository', () => ({
  conversationRepository: {
    findOrCreateForClient: jest.fn(),
    findById: jest.fn(),
    findByClientId: jest.fn(),
    listAllWithLastMessage: jest.fn(),
  },
}));
jest.mock('../message.repository', () => ({
  messageRepository: {
    create: jest.fn(),
    listForConversation: jest.fn(),
    markAllReadForConversation: jest.fn(),
  },
}));
jest.mock('../../client/client.repository', () => ({
  clientRepository: { findById: jest.fn() },
}));
jest.mock('../../notifications/notifications.service', () => ({
  notificationsService: { emitEvent: jest.fn() },
}));

import { conversationRepository } from '../conversation.repository';
import { messageRepository } from '../message.repository';
import { clientRepository } from '../../client/client.repository';
import { conversationService } from '../conversation.service';

describe('conversationService access control', () => {
  it('rejects a Client trying to access another Client conversation', async () => {
    await expect(
      conversationService.listMessages('other-client-id', {}, { id: 'client-a', type: 'CLIENT', email: 'a@x.com' })
    ).rejects.toThrow('own conversation');
  });

  it('allows a Client to access their own conversation', async () => {
    (conversationRepository.findOrCreateForClient as jest.Mock).mockResolvedValue({ id: 'conv1' });
    (messageRepository.listForConversation as jest.Mock).mockResolvedValue({ items: [], total: 0 });

    const result = await conversationService.listMessages('client-a', {}, {
      id: 'client-a',
      type: 'CLIENT',
      email: 'a@x.com',
    });
    expect(result.total).toBe(0);
  });

  it('allows an Admin to access any conversation', async () => {
    (conversationRepository.findOrCreateForClient as jest.Mock).mockResolvedValue({ id: 'conv1' });
    (messageRepository.listForConversation as jest.Mock).mockResolvedValue({ items: [], total: 0 });

    await expect(
      conversationService.listMessages('any-client-id', {}, { id: 'admin1', type: 'ADMIN', email: 'admin@x.com' })
    ).resolves.toBeDefined();
  });
});

describe('conversationService.sendMessage', () => {
  it('records sender attribution correctly for a Client-sent message', async () => {
    (clientRepository.findById as jest.Mock).mockResolvedValue({ id: 'client-a' });
    (conversationRepository.findOrCreateForClient as jest.Mock).mockResolvedValue({ id: 'conv1' });
    (messageRepository.create as jest.Mock).mockResolvedValue({ id: 'msg1' });

    await conversationService.sendMessage('client-a', 'Hello', { id: 'client-a', type: 'CLIENT', email: 'a@x.com' });

    expect(messageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ senderType: 'CLIENT', senderClientId: 'client-a' })
    );
  });
});
