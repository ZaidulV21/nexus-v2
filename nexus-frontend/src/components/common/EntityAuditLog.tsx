import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/StatusBadge';
import { ShieldCheck } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { useAuditLogs } from '@/queries/useAuditLogs';

/** Admin-only technical log view (distinct from Timeline - PRD: Timeline is
 *  human-readable, Audit Log is technical). Shows raw action + before/after
 *  state, never rendered in the Client Portal. */
export function EntityAuditLog({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { data, isLoading, isError, refetch } = useAuditLogs(entityType, entityId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) return <ErrorState description="Couldn't load the audit log." onRetry={refetch} />;

  if (!data || data.length === 0) {
    return <EmptyState icon={ShieldCheck} title="No audit entries" description="Technical change history will appear here." />;
  }

  return (
    <ul className="divide-y divide-border">
      {data.map((entry) => (
        <li key={entry.id} className="py-3">
          <div className="flex items-center justify-between">
            <Badge tone="neutral">{entry.action}</Badge>
            <span className="text-xs text-ink-faint">{formatDateTime(entry.createdAt)}</span>
          </div>
          {(entry.beforeState || entry.afterState) && (
            <pre className="mt-2 overflow-x-auto rounded-md bg-canvas p-2.5 font-mono text-xs text-ink-muted">
              {JSON.stringify({ before: entry.beforeState, after: entry.afterState }, null, 2)}
            </pre>
          )}
        </li>
      ))}
    </ul>
  );
}
