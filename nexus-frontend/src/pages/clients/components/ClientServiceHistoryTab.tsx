import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatRelativeTime } from '@/lib/format';
import type { ClientServiceHistoryItem } from '@/services/clientService';

export function ClientServiceHistoryTab({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: ClientServiceHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}) {
  const navigate = useNavigate();

  const columns: ColumnDef<ClientServiceHistoryItem, any>[] = [
    {
      accessorKey: 'leadNumber',
      header: 'Lead',
      cell: ({ row }) => (
        <span className="font-mono font-medium text-ink">{row.original.leadNumber}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-ink-muted">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'services',
      header: 'Requested Services',
      cell: ({ row }) => {
        const services = row.original.services;
        if (services.length === 0) return <span className="text-ink-faint">—</span>;
        const shown = services.slice(0, 2);
        const remaining = services.length - shown.length;
        return (
          <div className="flex flex-wrap gap-1">
            {shown.map((s, i) => (
              <span key={i} className="inline-block rounded-sm bg-canvas px-1.5 py-0.5 text-xs text-ink-muted">
                {s.name}
              </span>
            ))}
            {remaining > 0 && (
              <span className="inline-block rounded-sm bg-canvas px-1.5 py-0.5 text-xs text-ink-faint">
                +{remaining} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'currentStatus',
      header: 'Current Status',
      cell: ({ row }) => <StatusBadge status={row.original.currentStatus} />,
    },
    {
      id: 'project',
      header: 'Related Project',
      cell: ({ row }) =>
        row.original.relatedProjectNumber ? (
          <span className="font-mono text-ink">{row.original.relatedProjectNumber}</span>
        ) : (
          <span className="text-ink-faint">—</span>
        ),
    },
    {
      id: 'projectStatus',
      header: 'Project Status',
      cell: ({ row }) =>
        row.original.projectStatus ? <StatusBadge status={row.original.projectStatus} /> : <span className="text-ink-faint">—</span>,
    },
    {
      accessorKey: 'lastUpdated',
      header: 'Last Updated',
      cell: ({ row }) => (
        <span className="text-ink-muted">{formatRelativeTime(row.original.lastUpdated)}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      emptyTitle="No service requests"
      emptyDescription="This client has no associated service requests yet."
      onRowClick={(row) => navigate(`/leads/${row.id}`)}
    />
  );
}
