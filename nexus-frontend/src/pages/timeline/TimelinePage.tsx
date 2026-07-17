import { useState } from 'react';
import { History } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Timeline } from '@/components/ui/Timeline';
import { useDebounce } from '@/hooks/useDebounce';
import { useGlobalTimeline } from '@/queries/useTimeline';

const PAGE_SIZE = 25;
const FILTER_ALL = 'all';

/** Entity types the backend writes timeline events against. Display filter
 *  only - the backend query does the actual narrowing. */
const ENTITY_TYPES = [
  { value: 'LEAD', label: 'Leads' },
  { value: 'LEAD_SERVICE', label: 'Lead Services' },
  { value: 'CLIENT', label: 'Clients' },
  { value: 'QUOTATION', label: 'Quotations' },
  { value: 'PROJECT', label: 'Projects' },
  { value: 'PROJECT_SERVICE', label: 'Project Services' },
  { value: 'INVOICE', label: 'Invoices' },
  { value: 'CONVERSATION', label: 'Conversations' },
];

export function TimelinePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState(FILTER_ALL);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useGlobalTimeline({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    entityType: entityFilter === FILTER_ALL ? undefined : entityFilter,
  });

  const events = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Timeline"
        description="The business history of the platform - every important action, in the order it happened."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder="Search activity..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onClear={() => setSearch('')}
          className="max-w-sm"
        />
        <Select
          value={entityFilter}
          onValueChange={(value) => {
            setEntityFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>All activity</SelectItem>
            {ENTITY_TYPES.map((entityType) => (
              <SelectItem key={entityType.value} value={entityType.value}>
                {entityType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ) : isError ? (
            <ErrorState description="Couldn't load the timeline." onRetry={refetch} />
          ) : events.length === 0 ? (
            <EmptyState
              icon={History}
              title={search || entityFilter !== FILTER_ALL ? 'No activity matches your filters' : 'No activity yet'}
              description="Business events appear here as leads, quotations, projects, and invoices move through the workflow."
            />
          ) : (
            <Timeline events={events} />
          )}
        </CardContent>
      </Card>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            pageSize={data.meta.pageSize}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
