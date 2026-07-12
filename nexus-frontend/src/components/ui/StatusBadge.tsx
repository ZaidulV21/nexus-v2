import { cn } from '@/lib/utils';
import type { WorkflowStatus, QuotationStatus, InvoiceStatus } from '@/types';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const STATUS_TONE_MAP: Record<string, BadgeTone> = {
  NEW: 'neutral',
  QUALIFIED: 'info',
  CONTACTED: 'info',
  'SITE VISIT': 'warning',
  'QUOTE PREPARING': 'warning',
  'QUOTE SENT': 'accent',
  NEGOTIATION: 'accent',
  APPROVED: 'success',
  'PROJECT CREATED': 'success',
  'IN PROGRESS': 'accent',
  'ON HOLD': 'warning',
  COMPLETED: 'success',
  CLOSED: 'neutral',
  ARCHIVED: 'neutral',
  DRAFT: 'neutral',
  SENT: 'accent',
  REJECTED: 'danger',
  ISSUED: 'accent',
  PAID: 'success',
  'PARTIALLY PAID': 'warning',
  CANCELLED: 'danger',
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-canvas text-ink-muted border-border',
  accent: 'bg-accent-subtle text-accent border-transparent',
  success: 'bg-success-subtle text-success border-transparent',
  warning: 'bg-warning-subtle text-warning border-transparent',
  danger: 'bg-danger-subtle text-danger border-transparent',
  info: 'bg-info-subtle text-info border-transparent',
};

const dotToneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-ink-faint',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

export function StatusBadge({
  status,
  className,
}: {
  status: WorkflowStatus | QuotationStatus | InvoiceStatus | string;
  className?: string;
}) {
  const tone = STATUS_TONE_MAP[status] ?? 'neutral';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium capitalize',
        toneClasses[tone],
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotToneClasses[tone])} />
      {status.toLowerCase()}
    </span>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
