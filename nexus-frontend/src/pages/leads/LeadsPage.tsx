import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDebounce } from '@/hooks/useDebounce';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useLeadsList } from '@/queries/useLeads';
import { formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { Lead } from '@/types';
import { CreateLeadDrawer } from './components/CreateLeadDrawer';

const PAGE_SIZE = 20;

export function LeadsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const createDrawer = useDisclosure(false);

  const { data, isLoading, isError, refetch } = useLeadsList({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const columns = useMemo<ColumnDef<Lead, any>[]>(
    () => [
      {
        accessorKey: 'leadNumber',
        header: 'Lead',
        cell: (info) => (
          <div>
            <p className="font-mono text-sm font-medium text-ink">{info.getValue()}</p>
            <p className="text-xs text-ink-faint">{info.row.original.contactName}</p>
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
        id: 'services',
        header: 'Services',
        cell: (info) => {
          const services = info.row.original.leadServices ?? [];
          if (services.length === 0) return <span className="text-ink-faint">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {services.slice(0, 2).map((ls) => (
                <StatusBadge key={ls.id} status={ls.status} />
              ))}
              {services.length > 2 && (
                <span className="text-xs text-ink-faint">+{services.length - 2} more</span>
              )}
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

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Multi-service enquiries, from first contact through to conversion."
        actions={
          <Button size="sm" onClick={createDrawer.open}>
            <Plus className="h-3.5 w-3.5" /> New Lead
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          placeholder="Search by name, phone, email, or lead number..."
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
        onRowClick={(row) => navigate(ROUTES.leadDetail(row.id))}
        emptyTitle={search ? 'No leads match your search' : 'No leads yet'}
        emptyDescription={search ? 'Try a different search term.' : 'Leads created from the public enquiry form, or created here, will appear in this list.'}
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

      <CreateLeadDrawer
        open={createDrawer.isOpen}
        onOpenChange={createDrawer.setIsOpen}
        onCreated={(leadId) => {
          createDrawer.close();
          navigate(ROUTES.leadDetail(leadId));
        }}
      />
    </div>
  );
}
