import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Inbox, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/queries/useNotifications';
import { formatRelativeTime } from '@/lib/format';
import type { InAppNotification, NotificationType } from '@/services/notificationService';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  INFO: Info,
  SUCCESS: CheckCircle,
  WARNING: AlertTriangle,
  ERROR: AlertCircle,
};

const TYPE_TONE: Record<NotificationType, string> = {
  INFO: 'text-info',
  SUCCESS: 'text-success',
  WARNING: 'text-warning',
  ERROR: 'text-danger',
};

function NotificationRow({
  notification,
  onRead,
}: {
  notification: InAppNotification;
  onRead: (id: string, actionUrl?: string | null) => void;
}) {
  const Icon = TYPE_ICON[notification.type] ?? Bell;

  return (
    <button
      onClick={() => onRead(notification.id, notification.actionUrl)}
      className={cn(
        'flex w-full items-start gap-3 border-b border-border px-5 py-4 text-left transition-colors hover:bg-canvas',
        !notification.isRead && 'bg-accent-subtle/30'
      )}
    >
      <div className={cn('mt-0.5 shrink-0', TYPE_TONE[notification.type])}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', notification.isRead ? 'text-ink-muted' : 'font-medium text-ink')}>
          {notification.title}
        </p>
        <p className="mt-0.5 text-xs text-ink-faint line-clamp-2">{notification.description}</p>
        <p className="mt-1 text-xs text-ink-faint">{formatRelativeTime(notification.createdAt)}</p>
      </div>
      {!notification.isRead && (
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
      )}
    </button>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const isRead = filter === 'unread' ? false : filter === 'read' ? true : undefined;
  const { data, isLoading } = useNotifications(page, PAGE_SIZE, isRead);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const notifications = data?.items ?? [];
  const meta = data?.meta;

  function handleNotificationClick(id: string, actionUrl?: string | null) {
    markAsRead.mutate(id);
    if (actionUrl) {
      navigate(actionUrl);
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="View all your notifications"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-surface">
        <div className="flex border-b border-border">
          {(['all', 'unread', 'read'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setFilter(tab); setPage(1); }}
              className={cn(
                'px-4 py-2.5 text-sm font-medium capitalize transition-colors',
                filter === tab
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-ink-muted hover:text-ink'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-ink-muted">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Inbox className="h-8 w-8 text-ink-faint" strokeWidth={1.5} />
            <p className="text-sm text-ink-muted">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onRead={handleNotificationClick}
              />
            ))}
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
