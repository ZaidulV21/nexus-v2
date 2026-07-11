import { NotificationChannel } from './channels/channel.interface';
import { emailChannel } from './channels/email.channel';

// Add new channels here only - e.g. channels.set('WHATSAPP', whatsappChannel).
// No calling module ever needs to know which channels exist.
const channels = new Map<string, NotificationChannel>([['EMAIL', emailChannel]]);

export const notificationsDispatcher = {
  async dispatch(channelName: string, recipient: string, payload: Record<string, unknown>) {
    const channel = channels.get(channelName);
    if (!channel) {
      throw new Error(`Unknown notification channel: ${channelName}`);
    }
    await channel.send(recipient, payload);
  },
};
