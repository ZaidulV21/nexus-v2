import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useMyInvoices } from '@/queries/useInvoices';
import { formatCurrency, formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { Invoice } from '@/types';

export function PortalInvoicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useMyInvoices();

  const invoices = useMemo(() => {
    const items = data ?? [];
    if (!search) return items;
    const term = search.toLowerCase();
    return items.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(term) ||
        invoice.label.toLowerCase().includes(term) ||
        (invoice.project?.projectNumber ?? '').toLowerCase().includes(term)
    );
  }, [data, search]);

  const totals = useMemo(() => {
    const active = (data ?? []).filter((invoice) => invoice.status !== 'CANCELLED');
    const invoiced = active.reduce((sum, invoice) => sum + Number(invoice.grandTotal), 0);
    const paid = active.reduce((sum, invoice) => sum + (invoice.paidAmount ?? 0), 0);
    return { invoiced, paid, outstanding: invoiced - paid };
  }, [data]);

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
        id: 'project',
        header: 'Project',
        cell: (info) => (
          <span className="font-mono text-ink-muted">
            {info.row.original.project?.projectNumber ?? '—'}
          </span>
        ),
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
        id: 'paid',
        header: 'Paid',
        cell: (info) => <span className="text-ink-muted">{formatCurrency(info.row.original.paidAmount ?? 0)}</span>,
      },
      {
        id: 'outstanding',
        header: 'Outstanding',
        cell: (info) => (
          <span className="font-medium text-ink">{formatCurrency(info.row.original.outstandingAmount ?? 0)}</span>
        ),
      },
      {
        accessorKey: 'issuedAt',
        header: 'Issued',
        cell: (info) => <span className="text-ink-muted">{formatDate(info.getValue())}</span>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="My Invoices"
        description="Invoices issued by the business, with payments recorded against each."
        actions={
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            <Receipt className="h-4 w-4" /> Client view
          </span>
        }
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <StatCard label="Total Invoiced" value={formatCurrency(totals.invoiced)} icon={Receipt} />
        <StatCard label="Total Paid" value={formatCurrency(totals.paid)} icon={Receipt} />
        <StatCard label="Outstanding" value={formatCurrency(totals.outstanding)} icon={Receipt} />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(row) => navigate(ROUTES.portal.invoiceDetail(row.id))}
        emptyTitle={search ? 'No invoices match your search' : 'No invoices yet'}
        emptyDescription={
          search ? 'Try a different search term.' : 'Invoices will appear here once the business issues them.'
        }
      />
    </div>
  );
}
