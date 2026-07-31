import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDebounce } from '@/hooks/useDebounce';
import { usePaymentsList } from '@/queries/usePayments';
import { formatCurrency, formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { Payment } from '@/types';

const PAGE_SIZE = 20;
const FILTER_ALL = 'all';

const STATUS_OPTIONS = ['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'];

function getClientName(payment: Payment) {
  if (!payment.client) return '—';
  return payment.client.companyName || payment.client.contactName;
}

function getGateway(payment: Payment) {
  return payment.gatewayTransactionId ? 'Razorpay' : '—';
}

export function PaymentsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = usePaymentsList({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    sortBy: 'paidAt',
    sortOrder: 'desc',
    status: statusFilter !== FILTER_ALL ? statusFilter : undefined,
  });

  const payments = useMemo(() => data?.items ?? [], [data?.items]);

  const columns = useMemo<ColumnDef<Payment, any>[]>(
    () => [
      {
        id: 'invoice',
        header: 'Invoice',
        cell: (info) => (
          <span className="font-mono text-sm font-medium text-ink">
            {info.row.original.invoice?.invoiceNumber ?? '—'}
          </span>
        ),
      },
      {
        id: 'client',
        header: 'Client',
        cell: (info) => <span className="font-medium text-ink">{getClientName(info.row.original)}</span>,
      },
      {
        id: 'project',
        header: 'Project',
        cell: (info) => (
          <span className="font-mono text-ink-muted">{info.row.original.project?.projectNumber ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: (info) => <span className="font-medium text-ink">{formatCurrency(info.getValue())}</span>,
      },
      {
        accessorKey: 'method',
        header: 'Method',
        cell: (info) => <span className="text-ink-muted">{info.getValue()}</span>,
      },
      {
        id: 'gateway',
        header: 'Gateway',
        cell: (info) => <span className="text-ink-muted">{getGateway(info.row.original)}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      },
      {
        accessorKey: 'paidAt',
        header: 'Date',
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
        title="Payments"
        description="All payment records across invoices."
        actions={
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            <CreditCard className="h-4 w-4" /> Payment history
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
              {STATUS_OPTIONS.map((status) => (
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
        data={payments}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(row) => navigate(ROUTES.admin.invoiceDetail(row.invoiceId))}
        emptyTitle={search || statusFilter !== FILTER_ALL ? 'No payments match your filters' : 'No payments yet'}
        emptyDescription={
          search || statusFilter !== FILTER_ALL
            ? 'Try a different search or status filter.'
            : 'Payments made against invoices will appear here.'
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
