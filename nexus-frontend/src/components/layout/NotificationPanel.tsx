import { AnimatePresence, motion } from 'framer-motion';
import { BellOff } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  timestamp: string;
  read: boolean;
}

export function NotificationPanel({
  open,
  onClose,
  items = [],
}: {
  open: boolean;
  onClose: () => void;
  items?: NotificationItem[];
}) {
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
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-ink">Notifications</p>
            </div>
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <BellOff className="h-5 w-5 text-ink-faint" strokeWidth={1.75} />
                <p className="text-sm text-ink-muted">You&apos;re all caught up</p>
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto scrollbar-thin">
                {items.map((item) => (
                  <li key={item.id} className="border-b border-border px-4 py-3 last:border-0 hover:bg-canvas">
                    <p className="text-sm text-ink">{item.title}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">{item.timestamp}</p>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
