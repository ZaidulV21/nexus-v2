import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Copy, RotateCcw, Star, Flame } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterBar, type ActiveFilter } from '@/components/ui/FilterBar';
import { Badge } from '@/components/ui/StatusBadge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { useDebounce } from '@/hooks/useDebounce';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useToast } from '@/hooks/useToast';
import {
  useServicesList,
  useCategoryTree,
  useDuplicateService,
  useUndeleteService,
} from '@/queries/useServices';
import { formatCurrency, formatDate } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { ROUTES } from '@/routes/routes';
import type { Category, Service } from '@/types';
import type { ServiceStatusFilter } from '@/services/serviceCatalogService';
import { ServiceFormDrawer } from './components/ServiceFormDrawer';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: ServiceStatusFilter; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'DELETED', label: 'Deleted' },
];

function flattenCategories(categories: Category[], depth = 0): Array<{ id: string; label: string }> {
  return categories.flatMap((cat) => [
    { id: cat.id, label: `${'  '.repeat(depth)}${cat.name}` },
    ...flattenCategories(cat.children ?? [], depth + 1),
  ]);
}

export function ServiceStatusPill({ service }: { service: Pick<Service, 'isActive' | 'archivedAt' | 'deletedAt'> }) {
  if (service.deletedAt) return <Badge tone="danger">Deleted</Badge>;
  if (service.archivedAt) return <Badge tone="neutral">Archived</Badge>;
  if (!service.isActive) return <Badge tone="warning">Inactive</Badge>;
  return <Badge tone="success">Active</Badge>;
}

/** Per-row quick actions: duplicate any service, undelete soft-deleted ones. */
function ServiceRowActions({ service }: { service: Service }) {
  const { toast } = useToast();
  const duplicateMutation = useDuplicateService();
  const undeleteMutation = useUndeleteService(service.id);

  async function handleDuplicate() {
    try {
      const copy = await duplicateMutation.mutateAsync(service.id);
      toast({ title: 'Service duplicated', description: `"${copy.name}" was created from this one.`, variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not duplicate service',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleUndelete() {
    try {
      const restored = await undeleteMutation.mutateAsync();
      toast({ title: 'Service restored', description: `"${restored.name}" is visible again.`, variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not restore service',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleDuplicate}
        disabled={duplicateMutation.isPending}
        title="Duplicate this service"
        className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-accent disabled:opacity-50"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      {service.deletedAt && (
        <button
          onClick={handleUndelete}
          disabled={undeleteMutation.isPending}
          title="Restore deleted service"
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-accent disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function ServicesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ServiceStatusFilter>('ALL');
  const [categoryId, setCategoryId] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const createDrawer = useDisclosure(false);

  const { data: categories } = useCategoryTree();
  const categoryOptions = useMemo(() => flattenCategories(categories ?? []), [categories]);
  const { data, isLoading, isError, refetch } = useServicesList({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status,
    categoryId: categoryId || undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const activeFilters: ActiveFilter[] = [
    ...(status !== 'ALL' ? [{ key: 'status', label: `Status: ${STATUS_OPTIONS.find((o) => o.value === status)?.label}` }] : []),
    ...(categoryId
      ? [{ key: 'categoryId', label: `Category: ${categoryOptions.find((c) => c.id === categoryId)?.label.trim() ?? ''}` }]
      : []),
  ];

  const columns = useMemo<ColumnDef<Service, any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Service',
        cell: (info) => (
          <div className="flex items-center gap-3">
            {info.row.original.imageUrl ? (
              <img
                src={info.row.original.imageUrl}
                alt={info.row.original.name}
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-sm text-accent">
                {info.row.original.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-ink">{info.getValue()}</p>
              {info.row.original.description && (
                <p className="max-w-xs truncate text-xs text-ink-faint">{info.row.original.description}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        cell: (info) => <span className="text-ink-muted">{info.row.original.category?.name ?? '—'}</span>,
      },
      {
        accessorKey: 'basePrice',
        header: 'Base Price',
        cell: (info) => {
          const value = info.getValue();
          return value != null ? (
            <span className="font-mono text-ink-muted">{formatCurrency(value)}</span>
          ) : (
            <span className="text-ink-faint">—</span>
          );
        },
      },
      {
        accessorKey: 'estimatedDuration',
        header: 'Est. Duration',
        cell: (info) => <span className="text-ink-muted">{info.getValue() || '—'}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        cell: (info) => <ServiceStatusPill service={info.row.original} />,
      },
      {
        id: 'flags',
        header: 'Flags',
        cell: (info) => {
          const { isFeatured, isPopular } = info.row.original;
          if (!isFeatured && !isPopular) return <span className="text-ink-faint">—</span>;
          return (
            <div className="flex items-center gap-1.5">
              {isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                  <Star className="h-3 w-3" /> Featured
                </span>
              )}
              {isPopular && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                  <Flame className="h-3 w-3" /> Popular
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: (info) => (
          <span className="text-ink-muted">{info.getValue() ? formatDate(info.getValue()) : '—'}</span>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Services"
        description="The master catalog every lead, quotation, and project selects from."
        actions={
          <Button size="sm" onClick={createDrawer.open}>
            <Plus className="h-3.5 w-3.5" /> New Service
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            placeholder="Search services by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onClear={() => setSearch('')}
            className="max-w-sm"
          />
        </div>

        <FilterBar
          activeFilters={activeFilters}
          onRemoveFilter={(key) => {
            if (key === 'status') setStatus('ALL');
            if (key === 'categoryId') setCategoryId('');
            setPage(1);
          }}
          onClearAll={
            activeFilters.length
              ? () => {
                  setStatus('ALL');
                  setCategoryId('');
                  setPage(1);
                }
              : undefined
          }
        >
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as ServiceStatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={categoryId || 'ALL'}
            onValueChange={(value) => {
              setCategoryId(value === 'ALL' ? '' : value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {categoryOptions.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(row) => navigate(ROUTES.admin.serviceDetail(row.id))}
        emptyTitle={search || activeFilters.length ? 'No services match your filters' : 'No services yet'}
        emptyDescription={
          search || activeFilters.length
            ? 'Try a different search term or clear the filters.'
            : 'Services you add to the catalog appear here and become selectable in Leads and Quotations.'
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
        rowActions={(row) => <ServiceRowActions service={row} />}
      />

      <ServiceFormDrawer
        open={createDrawer.isOpen}
        onOpenChange={createDrawer.setIsOpen}
        onSaved={(serviceId) => navigate(ROUTES.admin.serviceDetail(serviceId))}
      />
    </div>
  );
}
