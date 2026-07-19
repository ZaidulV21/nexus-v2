import { formatDateTime } from '@/lib/format';
import type { TimelineEvent } from '@/types';
import { Circle } from 'lucide-react';

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-muted">No activity recorded yet.</p>;
  }

  return (
    <ol className="relative">
      {events.map((event, i) => (
        <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
          {i < events.length - 1 && (
            <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden />
          )}
          <Circle className="mt-1.5 h-2.5 w-2.5 shrink-0 fill-accent text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink">{event.description}</p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {event.entityRef && (
                <span className="mr-2 font-mono">
                  {event.entityRef.label}
                  {event.entityRef.name ? ` — ${event.entityRef.name}` : ''}
                </span>
              )}
              {formatDateTime(event.createdAt)}
              {event.actorRef && <span> · by {event.actorRef}</span>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
