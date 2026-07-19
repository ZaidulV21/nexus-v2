import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDebounce } from '@/hooks/useDebounce';
import { useInvoicesList } from '@/queries/useInvoices';
import { formatCurrency, formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { Invoice } from '@/types';

const PAGE_SIZE = 20;
const FILTER_ALL = 'all';

function getClientName(invoice: Invoice) {
  if (!invoice.client) return '—';
  return invoice.client.companyName || invoice.client.contactName;
}

function getProjectNumber(invoice: Invoice) {
  return invoice.project?.projectNumber ?? '—';
}

function matchesStatusFilter(invoice: Invoice, filter: string) {
  if (filter === FILTER_ALL) return true;
  return (invoice.displayStatus ?? invoice.status) === filter;
}

export function InvoicesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useInvoicesList({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    sortBy: 'issuedAt',
    sortOrder: 'desc',
  });

  const invoices = useMemo(
    () => (data?.items ?? []).filter((invoice) => matchesStatusFilter(invoice, statusFilter)),
    [data?.items, statusFilter]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set((data?.items ?? []).map((invoice) => invoice.displayStatus ?? invoice.status))).sort(),
    [data?.items]
  );

  const columns = useMemo<ColumnDef<Invoice, any>[]>(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: 'Invoice',
        cell: (info) => (
          <div>
            <p className="font-mono text-sm font-medium text-ink">{info.getValue()}</p>
            <p className="text-xs text-ink-faint">{info.row.original.label}</p>
          </div>
        ),
      },
      {
        id: 'client',
        header: 'Client',
        cell: (info) => <span className="font-medium text-ink">{getClientName(info.row.original)}</span>,
      },
      {
        id: 'project',
        header: 'Related Project',
        cell: (info) => <span className="font-mono text-ink-muted">{getProjectNumber(info.row.original)}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        cell: (info) => <StatusBadge status={info.row.original.displayStatus ?? info.row.original.status} />,
      },
      {
        accessorKey: 'grandTotal',
        header: 'Total',
        cell: (info) => <span className="font-medium text-ink">{formatCurrency(info.getValue())}</span>,
      },
      {
        accessorKey: 'paidAmount',
        header: 'Paid',
        cell: (info) => <span className="text-ink-muted">{formatCurrency(info.getValue() ?? 0)}</span>,
      },
      {
        accessorKey: 'outstandingAmount',
        header: 'Outstanding',
        cell: (info) => <span className="text-ink-muted">{formatCurrency(info.getValue() ?? 0)}</span>,
      },
      {
        accessorKey: 'dueDate',
        header: 'Due Date',
        cell: (info) => (
          <span className="text-ink-muted">{info.getValue() ? formatDate(info.getValue()) : 'Not provided'}</span>
        ),
      },
      {
        accessorKey: 'issuedAt',
        header: 'Created',
        cell: (info) => <span className="text-ink-muted">{formatDate(info.getValue())}</span>,
      },
    ],
    []
  );

  const activeFilters =
    statusFilter === FILTER_ALL ? [] : [{ key: 'status', label: `Status: ${statusFilter}` }];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Project invoices with backend-calculated payment status and outstanding balance."
        actions={
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            <Receipt className="h-4 w-4" /> Project billing
          </span>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <SearchInput
          placeholder="Search by invoice, client, or project..."
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
        data={invoices}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(row) => navigate(ROUTES.invoiceDetail(row.id))}
        emptyTitle={search || statusFilter !== FILTER_ALL ? 'No invoices match your filters' : 'No invoices yet'}
        emptyDescription={
          search || statusFilter !== FILTER_ALL
            ? 'Try a different search or status filter.'
            : 'Invoices generated against projects will appear here.'
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
