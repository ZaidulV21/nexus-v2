import { Avatar } from './Avatar';
import { formatRelativeTime } from '@/lib/format';

export interface ActivityItem {
  id: string;
  actorName: string;
  action: string;
  target?: string;
  timestamp: string;
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-muted">No recent activity.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-3">
          <Avatar name={item.actorName} size={28} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink">
              <span className="font-medium">{item.actorName}</span> {item.action}
              {item.target && <span className="font-medium"> {item.target}</span>}
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">{formatRelativeTime(item.timestamp)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
