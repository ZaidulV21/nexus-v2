import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { FilePlus2, FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { useDebounce } from '@/hooks/useDebounce';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useQuotationsList } from '@/queries/useQuotations';
import { formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { Quotation } from '@/types';
import { QuotationFormDrawer } from './components/QuotationFormDrawer';

const PAGE_SIZE = 20;

export function QuotationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const createModal = useDisclosure(false);

  const { data, isLoading, isError, refetch } = useQuotationsList({
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
        cell: (info) => (
          <div>
            <p className="font-mono text-sm font-medium text-ink">{info.getValue()}</p>
            <p className="text-xs text-ink-faint">{info.row.original.status}</p>
          </div>
        ),
      },
      {
        id: 'lead',
        header: 'Lead',
        cell: (info) => {
          const row = info.row.original;
          const lead = row.lead ?? row.client?.sourceLead ?? null;
          return lead ? (
            <div>
              <p className="font-mono text-sm text-ink-muted">{lead.leadNumber}</p>
              <p className="text-xs text-ink-faint">{lead.contactName}</p>
            </div>
          ) : (
            <span className="text-ink-faint">—</span>
          );
        },
      },
      {
        id: 'client',
        header: 'Client',
        cell: (info) => {
          const client = info.row.original.client;
          return client ? (
            <div>
              <p className="font-mono text-sm text-ink-muted">{client.clientNumber}</p>
              <p className="text-xs text-ink-faint">{client.companyName || client.contactName}</p>
            </div>
          ) : (
            <span className="text-ink-faint">—</span>
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

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Versioned quotations linked to leads and projects."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={createModal.open}>
              <FilePlus2 className="h-3.5 w-3.5" /> New quotation
            </Button>
            <span className="flex items-center gap-2 text-sm text-ink-muted"><FileSpreadsheet className="h-4 w-4" /> Quotations</span>
          </div>
        }
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
        onRowClick={(row) => navigate(ROUTES.quotationDetail(row.id))}
        emptyTitle={search ? 'No quotations match your search' : 'No quotations yet'}
        emptyDescription={search ? 'Try a different search term.' : 'New quotations created from approved leads will appear here.'}
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

      <QuotationFormDrawer open={createModal.isOpen} onOpenChange={createModal.setIsOpen} mode="create" />
    </div>
  );
}
