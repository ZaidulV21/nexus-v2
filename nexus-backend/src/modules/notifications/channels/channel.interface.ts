export interface NotificationChannel {
  name: string;
  send(recipient: string, payload: Record<string, unknown>): Promise<void>;
}
