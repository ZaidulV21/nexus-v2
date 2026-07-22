import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/app/AuthContext';
import { useClientQuotationsList } from '@/queries/useQuotations';
import { formatCurrency, formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { Quotation } from '@/types';

const PAGE_SIZE = 20;

function getActiveVersion(quotation: Quotation) {
  return quotation.versions?.find((version) => version.isActive) ?? quotation.versions?.[0];
}

export function PortalQuotationsPage() {
  const navigate = useNavigate();
  const { actor } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useClientQuotationsList(actor?.id, {
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const columns = useMemo<ColumnDef<Quotation, any>[]>(
    () => [
      {
        accessorKey: 'quotationNumber',
        header: 'Quotation',
        cell: (info) => {
          const row = info.row.original;
          const leadNumber = row.lead?.leadNumber ?? row.client?.sourceLead?.leadNumber ?? null;
          return (
            <div>
              <p className="font-mono text-sm font-medium text-ink">{info.getValue()}</p>
              <p className="text-xs text-ink-faint">{leadNumber ?? '—'}</p>
            </div>
          );
        },
      },
      {
        id: 'version',
        header: 'Version',
        cell: (info) => {
          const version = getActiveVersion(info.row.original);
          return <span className="text-ink-muted">{version ? `v${version.versionNumber}` : '-'}</span>;
        },
      },
      {
        id: 'amount',
        header: 'Amount',
        cell: (info) => {
          const version = getActiveVersion(info.row.original);
          return (
            <span className="font-medium text-ink">{version ? formatCurrency(version.grandTotal) : '-'}</span>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: (info) => <StatusBadge status={info.row.original.status} />,
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
        title="My Quotations"
        description="Quotations sent by the business for your review and decision."
        actions={<span className="flex items-center gap-2 text-sm text-ink-muted"><FileText className="h-4 w-4" /> Client view</span>}
      />

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          placeholder="Search quotations..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onClear={() => setSearch('')}
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(row) => navigate(ROUTES.portal.quotationDetail(row.id))}
        emptyTitle={search ? 'No quotations match your search' : 'No quotations yet'}
        emptyDescription={search ? 'Try a different search term.' : 'Quotations will appear here after the admin sends them to you.'}
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

      {!actor && (
        <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink-muted">
          <div className="flex items-center gap-2 font-medium text-ink">
            <RefreshCw className="h-4 w-4" />
            Sign in as a client to see your quotations.
          </div>
        </div>
      )}
    </div>
  );
}
