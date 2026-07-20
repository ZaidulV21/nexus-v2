import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BellOff, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/queries/useNotifications';
import { formatRelativeTime } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { InAppNotification, NotificationType } from '@/services/notificationService';
import { cn } from '@/lib/utils';

const TYPE_ICON: Record<NotificationType, typeof BellOff> = {
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

function PanelNotificationItem({
  notification,
  onRead,
}: {
  notification: InAppNotification;
  onRead: (id: string, actionUrl?: string | null) => void;
}) {
  const Icon = TYPE_ICON[notification.type] ?? Info;

  return (
    <button
      onClick={() => onRead(notification.id, notification.actionUrl)}
      className={cn(
        'flex w-full items-start gap-2.5 border-b border-border px-4 py-3 text-left transition-colors hover:bg-canvas last:border-0',
        !notification.isRead && 'bg-accent-subtle/20'
      )}
    >
      <div className={cn('mt-0.5 shrink-0', TYPE_TONE[notification.type])}>
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-xs', notification.isRead ? 'text-ink-muted' : 'font-medium text-ink')}>
          {notification.title}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-faint line-clamp-1">{notification.description}</p>
        <p className="mt-0.5 text-[10px] text-ink-faint">{formatRelativeTime(notification.createdAt)}</p>
      </div>
      {!notification.isRead && (
        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      )}
    </button>
  );
}

export function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { data } = useNotifications(1, 8);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const notifications = data?.items ?? [];

  function handleNotificationClick(id: string, actionUrl?: string | null) {
    markAsRead.mutate(id);
    onClose();
    if (actionUrl) {
      navigate(actionUrl);
    }
  }

  function handleViewAll() {
    onClose();
    navigate(ROUTES.notifications);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-ink">Notifications</p>
              <button
                onClick={() => markAllAsRead.mutate()}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Mark all read
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <BellOff className="h-5 w-5 text-ink-faint" strokeWidth={1.75} />
                <p className="text-sm text-ink-muted">You&apos;re all caught up</p>
              </div>
            ) : (
              <>
                <ul className="max-h-80 overflow-y-auto scrollbar-thin">
                  {notifications.map((n) => (
                    <PanelNotificationItem
                      key={n.id}
                      notification={n}
                      onRead={handleNotificationClick}
                    />
                  ))}
                </ul>
                <button
                  onClick={handleViewAll}
                  className="w-full border-t border-border px-4 py-2.5 text-center text-xs font-medium text-accent transition-colors hover:bg-canvas"
                >
                  View all notifications
                </button>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
