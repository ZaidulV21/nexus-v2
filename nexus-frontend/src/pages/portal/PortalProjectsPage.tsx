import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { FolderKanban } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useMyProjects } from '@/queries/useProjects';
import { formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { Project } from '@/types';

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="w-28">
      <div className="mb-1 flex justify-between text-xs text-ink-muted">
        <span>{percentage}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-canvas ring-1 ring-inset ring-border">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function PortalProjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useMyProjects();

  const projects = useMemo(() => {
    const items = data ?? [];
    if (!search) return items;
    const term = search.toLowerCase();
    return items.filter(
      (project) =>
        project.projectNumber.toLowerCase().includes(term) ||
        (project.aggregateStatus ?? '').toLowerCase().includes(term) ||
        project.projectServices?.some((service) => service.service?.name.toLowerCase().includes(term))
    );
  }, [data, search]);

  const columns = useMemo<ColumnDef<Project, any>[]>(
    () => [
      {
        accessorKey: 'projectNumber',
        header: 'Project',
        cell: (info) => (
          <div>
            <p className="font-mono text-sm font-medium text-ink">{info.getValue()}</p>
            <p className="text-xs text-ink-faint">
              {(info.row.original.projectServices ?? [])
                .map((service) => service.service?.name)
                .filter(Boolean)
                .join(', ') || 'No services yet'}
            </p>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (info) => <StatusBadge status={info.row.original.aggregateStatus ?? 'NO SERVICES'} />,
      },
      {
        id: 'progress',
        header: 'Progress',
        cell: (info) => <ProgressBar percentage={info.row.original.completionPercentage ?? 0} />,
      },
      {
        id: 'services',
        header: 'Services',
        cell: (info) => (
          <span className="text-ink-muted">
            {info.row.original.completedServices ?? 0}/{info.row.original.totalServices ?? 0} completed
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: (info) => <span className="text-ink-muted">{formatDate(info.getValue())}</span>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="My Projects"
        description="Each project is tracked per service - progress and status update as the business moves work forward."
        actions={
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            <FolderKanban className="h-4 w-4" /> Client view
          </span>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={projects}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(row) => navigate(ROUTES.portal.projectDetail(row.id))}
        emptyTitle={search ? 'No projects match your search' : 'No projects yet'}
        emptyDescription={
          search
            ? 'Try a different search term.'
            : 'Once a quotation is accepted, its project will appear here with live status.'
        }
      />
    </div>
  );
}
