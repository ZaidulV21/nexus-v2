import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { useGlobalAuditLogs } from '@/queries/useAuditLogs';
import { formatDateTime } from '@/lib/format';
import type { AuditLogEntry } from '@/types';

const PAGE_SIZE = 25;
const FILTER_ALL = 'all';

const ENTITY_TYPES = [
  { value: 'LEAD', label: 'Leads' },
  { value: 'LEAD_SERVICE', label: 'Lead Services' },
  { value: 'CLIENT', label: 'Clients' },
  { value: 'QUOTATION', label: 'Quotations' },
  { value: 'PROJECT', label: 'Projects' },
  { value: 'PROJECT_SERVICE', label: 'Project Services' },
  { value: 'INVOICE', label: 'Invoices' },
];

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState(FILTER_ALL);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useGlobalAuditLogs({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    entityType: entityFilter === FILTER_ALL ? undefined : entityFilter,
  });

  const columns = useMemo<ColumnDef<AuditLogEntry, any>[]>(
    () => [
      {
        accessorKey: 'action',
        header: 'Action',
        cell: (info) => <Badge tone="neutral">{info.getValue()}</Badge>,
      },
      {
        id: 'entity',
        header: 'Entity',
        cell: (info) => (
          <div>
            <p className="text-sm font-medium capitalize text-ink">
              {info.row.original.entityType.replace(/_/g, ' ').toLowerCase()}
            </p>
            <p className="font-mono text-xs text-ink-faint">{info.row.original.entityId}</p>
          </div>
        ),
      },
      {
        accessorKey: 'actorUserId',
        header: 'Actor',
        cell: (info) => <span className="font-mono text-xs text-ink-muted">{info.getValue() ?? 'system'}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Timestamp',
        cell: (info) => <span className="text-ink-muted">{formatDateTime(info.getValue())}</span>,
      },
    ],
    []
  );

  const expandedEntry = (data?.items ?? []).find((entry) => entry.id === expandedId);

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Technical change record - field-level before/after state for every write. Admin-only, never client-facing."
        actions={
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            <ShieldCheck className="h-4 w-4" /> Read-only
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder="Search action, entity, or ID..."
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
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>All entities</SelectItem>
            {ENTITY_TYPES.map((entityType) => (
              <SelectItem key={entityType.value} value={entityType.value}>
                {entityType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(row) => setExpandedId((current) => (current === row.id ? null : row.id))}
        emptyTitle={search || entityFilter !== FILTER_ALL ? 'No audit entries match your filters' : 'No audit entries yet'}
        emptyDescription="Every state-changing action writes an audit entry automatically."
        pagination={
          data?.meta
            ? {
                page: data.meta.page,
                totalPages: data.meta.totalPages,
                total: data.meta.total,
                pageSize: data.meta.pageSize,
                onPageChange: setPage,
              }
            : undefined
        }
        rowActions={(row) => (
          <Button variant="ghost" size="sm" onClick={() => setExpandedId((current) => (current === row.id ? null : row.id))}>
            {expandedId === row.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        )}
      />

      {expandedEntry && (expandedEntry.beforeState || expandedEntry.afterState) && (
        <Card className="mt-4">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">
                <Badge tone="neutral">{expandedEntry.action}</Badge>
                <span className="ml-2 text-ink-muted">{formatDateTime(expandedEntry.createdAt)}</span>
              </p>
              <Button variant="ghost" size="sm" onClick={() => setExpandedId(null)}>
                Close
              </Button>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">Before</p>
                <pre className="max-h-80 overflow-auto rounded-md bg-canvas p-3 font-mono text-xs text-ink-muted">
                  {expandedEntry.beforeState ? JSON.stringify(expandedEntry.beforeState, null, 2) : '—'}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">After</p>
                <pre className="max-h-80 overflow-auto rounded-md bg-canvas p-3 font-mono text-xs text-ink-muted">
                  {expandedEntry.afterState ? JSON.stringify(expandedEntry.afterState, null, 2) : '—'}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
