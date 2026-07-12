import { Timeline } from '@/components/ui/Timeline';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useTimeline } from '@/queries/useTimeline';

/** Drop into any module's detail page: fetches and renders the entity's
 *  Timeline (M2 backend module) via the shared Timeline UI component.
 *  entityType must match the backend's entity_type convention exactly
 *  (e.g. 'LEAD', 'PROJECT', 'INVOICE', 'QUOTATION'). */
export function EntityTimeline({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { data, isLoading, isError, refetch } = useTimeline(entityType, entityId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-3/4" />
      </div>
    );
  }

  if (isError) return <ErrorState description="Couldn't load the timeline." onRetry={refetch} />;

  return <Timeline events={data ?? []} />;
}
