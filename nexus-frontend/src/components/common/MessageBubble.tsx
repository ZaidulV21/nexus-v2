import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import type { Message } from '@/types';

/** Chat bubble shared by the Admin messaging center and the Client Portal
 *  messages page - the only difference between the two surfaces is which
 *  senderType counts as "own" and what the other party is called. */
export function MessageBubble({
  message,
  isOwn,
  otherPartyLabel,
}: {
  message: Message;
  isOwn: boolean;
  otherPartyLabel: string;
}) {
  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm',
          isOwn ? 'bg-accent text-white' : 'border border-border bg-canvas text-ink'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p className={cn('mt-1 text-[11px]', isOwn ? 'text-white/70' : 'text-ink-faint')}>
          {isOwn ? 'You' : otherPartyLabel} · {formatDateTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
