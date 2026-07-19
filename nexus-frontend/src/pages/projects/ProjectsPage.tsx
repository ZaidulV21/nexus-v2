import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { FolderKanban } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDebounce } from '@/hooks/useDebounce';
import { useProjectsList } from '@/queries/useProjects';
import { formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { Project } from '@/types';

const PAGE_SIZE = 20;
const FILTER_ALL = 'all';

function getClientName(project: Project) {
  if (!project.client) return '—';
  return project.client.companyName || project.client.contactName;
}

function matchesStatusFilter(project: Project, filter: string) {
  if (filter === FILTER_ALL) return true;
  return (project.aggregateStatus ?? 'NO SERVICES') === filter;
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useProjectsList({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const projects = useMemo(
    () => (data?.items ?? []).filter((project) => matchesStatusFilter(project, statusFilter)),
    [data?.items, statusFilter]
  );
  const statusOptions = useMemo(
    () =>
      Array.from(new Set((data?.items ?? []).map((project) => project.aggregateStatus ?? 'NO SERVICES'))).sort(),
    [data?.items]
  );

  const columns = useMemo<ColumnDef<Project, any>[]>(
    () => [
      {
        accessorKey: 'projectNumber',
        header: 'Project',
        cell: (info) => (
          <div>
            <p className="font-mono text-sm font-medium text-ink">{info.getValue()}</p>
          </div>
        ),
      },
      {
        id: 'client',
        header: 'Client',
        cell: (info) => (
          <div>
            <p className="font-medium text-ink">{getClientName(info.row.original)}</p>
            <p className="text-xs text-ink-faint">{info.row.original.client?.email ?? '—'}</p>
          </div>
        ),
      },
      {
        id: 'lead',
        header: 'Related Lead',
        cell: (info) => (
          <span className="font-mono text-ink-muted">
            {info.row.original.lead?.leadNumber ?? '—'}
          </span>
        ),
      },
      {
        id: 'services',
        header: 'Services',
        cell: (info) => (
          <span className="text-ink-muted">
            {info.row.original.totalServices ?? info.row.original.projectServices?.length ?? 0}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Current Status',
        cell: (info) => <StatusBadge status={info.row.original.aggregateStatus ?? 'NO SERVICES'} />,
      },
      {
        id: 'progress',
        header: 'Progress',
        cell: (info) => {
          const completed = info.row.original.completedServices ?? 0;
          const total = info.row.original.totalServices ?? info.row.original.projectServices?.length ?? 0;
          const percent = info.row.original.completionPercentage ?? 0;
          return (
            <div className="min-w-36">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-ink-muted">
                <span>
                  {completed}/{total} services
                </span>
                <span>{percent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-canvas">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: (info) => <span className="text-ink-muted">{formatDate(info.getValue())}</span>,
      },
    ],
    []
  );

  const activeFilters =
    statusFilter === FILTER_ALL
      ? []
      : [{ key: 'status', label: `Status: ${statusFilter}` }];

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Client projects created after approved quotations and lead conversion."
        actions={
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            <FolderKanban className="h-4 w-4" /> Project services
          </span>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <SearchInput
          placeholder="Search by project, client, or lead..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          onClear={() => setSearch('')}
          className="max-w-sm"
        />

        <FilterBar
          activeFilters={activeFilters}
          onRemoveFilter={() => setStatusFilter(FILTER_ALL)}
          onClearAll={() => setStatusFilter(FILTER_ALL)}
        >
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>All statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        data={projects}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(row) => navigate(ROUTES.projectDetail(row.id))}
        emptyTitle={search || statusFilter !== FILTER_ALL ? 'No projects match your filters' : 'No projects yet'}
        emptyDescription={
          search || statusFilter !== FILTER_ALL
            ? 'Try a different search or status filter.'
            : 'Projects created from approved quotations will appear here.'
        }
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
      />
    </div>
  );
}
