import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { useDebounce } from '@/hooks/useDebounce';
import { useClientsList } from '@/queries/useClients';
import { formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { Client } from '@/types';

const PAGE_SIZE = 20;

export function ClientsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useClientsList({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const columns = useMemo<ColumnDef<Client, any>[]>(
    () => [
      {
        accessorKey: 'contactName',
        header: 'Contact',
        cell: (info) => (
          <div>
            <p className="font-medium text-ink">{info.getValue()}</p>
            <p className="text-xs text-ink-faint">{info.row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'companyName',
        header: 'Company',
        cell: (info) => <span className="text-ink-muted">{info.getValue() || '—'}</span>,
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: (info) => <span className="font-mono text-ink-muted">{info.getValue()}</span>,
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
        title="Clients"
        description="Converted leads with active accounts and project history."
        actions={<span className="flex items-center gap-2 text-sm text-ink-muted"><Users className="h-4 w-4" /> Managed accounts</span>}
      />

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          placeholder="Search by name, company, phone, or email..."
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
        onRowClick={(row) => navigate(ROUTES.clientDetail(row.id))}
        emptyTitle={search ? 'No clients match your search' : 'No clients yet'}
        emptyDescription={search ? 'Try a different search term.' : 'Clients will appear here once leads have been converted into accounts.'}
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
