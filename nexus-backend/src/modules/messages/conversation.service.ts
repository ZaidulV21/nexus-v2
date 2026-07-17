import { conversationRepository } from './conversation.repository';
import { messageRepository } from './message.repository';
import { clientRepository } from '../client/client.repository';
import { notificationsService } from '../notifications/notifications.service';
import { NotFoundError, ForbiddenError } from '../../core/errors/AppError';
import { AuthPayload } from '../../core/middleware/authenticate';

async function assertAccess(clientId: string, actor: AuthPayload) {
  if (actor.type === 'CLIENT' && actor.id !== clientId) {
    throw new ForbiddenError('You may only access your own conversation');
  }
}

export const conversationService = {
  async sendMessage(clientId: string, body: string, actor: AuthPayload) {
    await assertAccess(clientId, actor);

    const client = await clientRepository.findById(clientId);
    if (!client) throw new NotFoundError('Client not found');

    const conversation = await conversationRepository.findOrCreateForClient(clientId);

    const message = await messageRepository.create({
      conversationId: conversation.id,
      senderType: actor.type,
      senderUserId: actor.type === 'ADMIN' ? actor.id : undefined,
      senderClientId: actor.type === 'CLIENT' ? actor.id : undefined,
      body,
    });

    if (actor.type === 'CLIENT') {
      await notificationsService.emitEvent({
        eventType: 'message.received',
        entityType: 'CONVERSATION',
        entityId: conversation.id,
        recipient: 'admin-inbox',
        payload: { clientId, preview: body.slice(0, 100) },
      });
    }

    return message;
  },

  async listMessages(clientId: string, pagination: any, actor: AuthPayload) {
    await assertAccess(clientId, actor);

    const conversation = await conversationRepository.findOrCreateForClient(clientId);
    return messageRepository.listForConversation(conversation.id, pagination);
  },

  async markRead(clientId: string, actor: AuthPayload) {
    await assertAccess(clientId, actor);

    const conversation = await conversationRepository.findByClientId(clientId);
    if (!conversation) return { updated: 0 };

    const result = await messageRepository.markAllReadForConversation(conversation.id, actor.type);
    return { updated: result.count };
  },

  async listAllConversations() {
    const conversations = await conversationRepository.listAllWithLastMessage();
    // Attach the Admin-perspective unread count (client-sent, unread) so
    // the inbox can badge conversations without N extra requests.
    return Promise.all(
      conversations.map(async (conversation: any) => ({
        ...conversation,
        unreadCount: await messageRepository.countUnreadForConversation(conversation.id, 'ADMIN'),
      }))
    );
  },
};
