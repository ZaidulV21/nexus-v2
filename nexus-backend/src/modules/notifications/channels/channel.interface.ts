export type ChannelSendResult =
  | { status: 'SENT'; messageId?: string }
  | { status: 'SKIPPED'; reason?: string };

export interface NotificationChannel {
  name: string;
  send(recipient: string, payload: Record<string, unknown>): Promise<ChannelSendResult>;
}
