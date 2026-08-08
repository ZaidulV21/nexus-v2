import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Checkbox } from '@/components/ui/Checkbox';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterBar, type ActiveFilter } from '@/components/ui/FilterBar';
import { Badge } from '@/components/ui/StatusBadge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ServiceIcon } from '@/components/common/ServiceIcon';
import { useDebounce } from '@/hooks/useDebounce';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useToast } from '@/hooks/useToast';
import {
  useSubServicesList,
  useArchiveSubService,
  useRestoreSubService,
  useSoftDeleteSubService,
  useUndeleteSubService,
  useReorderSubServices,
  usePublishSubService,
  useDraftSubService,
  useBulkSubServices,
} from '@/queries/useServices';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Service, SubService } from '@/types';
import type { SubServiceStatusFilter, PublicationFilter, BulkCatalogAction } from '@/services/serviceCatalogService';
import { SubServiceFormDrawer } from './SubServiceFormDrawer';
import { PublicationStatePill } from '../ServicesPage';

const STATUS_OPTIONS: Array<{ value: SubServiceStatusFilter; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'DELETED', label: 'Deleted' },
];

const PUBLICATION_OPTIONS: Array<{ value: PublicationFilter; label: string }> = [
  { value: 'ALL', label: 'All publication states' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Drafts' },
];

const BULK_OPTIONS: Array<{ value: BulkCatalogAction; label: string; destructive?: boolean }> = [
  { value: 'publish', label: 'Publish' },
  { value: 'draft', label: 'Move to draft' },
  { value: 'activate', label: 'Activate' },
  { value: 'deactivate', label: 'Deactivate' },
  { value: 'archive', label: 'Archive', destructive: true },
  { value: 'delete', label: 'Delete', destructive: true },
];

export function SubServiceStatusPill({
  sub,
}: {
  sub: Pick<SubService, 'isActive' | 'archivedAt' | 'deletedAt'>;
}) {
  if (sub.deletedAt) return <Badge tone="danger">Deleted</Badge>;
  if (sub.archivedAt) return <Badge tone="neutral">Archived</Badge>;
  if (!sub.isActive) return <Badge tone="warning">Inactive</Badge>;
  return <Badge tone="success">Active</Badge>;
}

type ConfirmKind = 'archive' | 'restore' | 'delete' | 'undelete';

interface ConfirmTarget {
  sub: SubService;
  kind: ConfirmKind;
}

function SubPublishButton({ sub, serviceRef }: { sub: SubService; serviceRef: string }) {
  const { toast } = useToast();
  const publishMutation = usePublishSubService(serviceRef, sub.id);
  async function handle() {
    try {
      await publishMutation.mutateAsync();
      toast({ title: 'Sub-service published', description: `"${sub.name}" is now live on the public site.`, variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not publish sub-service',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }
  return (
    <button
      onClick={handle}
      disabled={publishMutation.isPending}
      title="Publish (visible on public site)"
      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-success disabled:opacity-50"
    >
      <Eye className="h-3.5 w-3.5" />
    </button>
  );
}

function SubDraftButton({ sub, serviceRef }: { sub: SubService; serviceRef: string }) {
  const { toast } = useToast();
  const draftMutation = useDraftSubService(serviceRef, sub.id);
  async function handle() {
    try {
      await draftMutation.mutateAsync();
      toast({ title: 'Sub-service moved to draft', description: `"${sub.name}" is no longer visible on the public site.`, variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not move sub-service to draft',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }
  return (
    <button
      onClick={handle}
      disabled={draftMutation.isPending}
      title="Move to draft (hidden from public site)"
      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-warning disabled:opacity-50"
    >
      <EyeOff className="h-3.5 w-3.5" />
    </button>
  );
}

const CONFIRM_LABELS: Record<ConfirmKind, { title: string; confirm: string; destructive: boolean }> = {
  archive: { title: 'Archive this sub-service?', confirm: 'Archive', destructive: true },
  restore: { title: 'Restore this sub-service?', confirm: 'Restore', destructive: false },
  delete: { title: 'Delete this sub-service?', confirm: 'Delete', destructive: true },
  undelete: { title: 'Restore this sub-service?', confirm: 'Restore', destructive: false },
};

/** Manage the CMS sub-services living under one service. */
export function SubServicesTab({ service }: { service: Service }) {
  const serviceRef = service.id;
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SubServiceStatusFilter>('ALL');
  const [publication, setPublication] = useState<PublicationFilter>('ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkCatalogAction | ''>('');
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const debouncedSearch = useDebounce(search, 350);

  const createDrawer = useDisclosure(false);
  const editDrawer = useDisclosure(false);
  const [editing, setEditing] = useState<SubService | undefined>(undefined);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);

  const { data, isLoading, isError, refetch } = useSubServicesList(serviceRef, {
    page,
    pageSize: 100,
    search: debouncedSearch || undefined,
    status,
    publication: publication === 'ALL' ? undefined : publication,
  });

  const archiveMutation = useArchiveSubService(serviceRef, confirm?.sub.id ?? '');
  const restoreMutation = useRestoreSubService(serviceRef, confirm?.sub.id ?? '');
  const softDeleteMutation = useSoftDeleteSubService(serviceRef, confirm?.sub.id ?? '');
  const undeleteMutation = useUndeleteSubService(serviceRef, confirm?.sub.id ?? '');
  const reorderMutation = useReorderSubServices(serviceRef);
  const bulkMutation = useBulkSubServices(serviceRef);

  const canReorder =
    status === 'ALL' && publication === 'ALL' && !debouncedSearch && (data?.meta.totalPages ?? 1) <= 1;

  const activeFilters: ActiveFilter[] = [
    ...(status !== 'ALL'
      ? [{ key: 'status', label: `Status: ${STATUS_OPTIONS.find((o) => o.value === status)?.label}` }]
      : []),
    ...(publication !== 'ALL'
      ? [{ key: 'publication', label: `Publication: ${PUBLICATION_OPTIONS.find((o) => o.value === publication)?.label}` }]
      : []),
  ];

  const currentIds = useMemo(() => (data?.items ?? []).map((s) => s.id), [data]);

  function toggleSelected(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      currentIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  async function handleBulkApply() {
    if (!bulkAction || selected.size === 0) return;
    try {
      const result = await bulkMutation.mutateAsync({ ids: [...selected], action: bulkAction });
      toast({
        title: 'Bulk action complete',
        description: `${result.updatedCount} of ${selected.size} selected sub-service(s) were updated.`,
        variant: 'success',
      });
      setSelected(new Set());
      setBulkAction('');
      setBulkConfirm(false);
    } catch (err) {
      toast({
        title: 'Bulk action failed',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  function handleBulkSelect(value: string) {
    const action = value as BulkCatalogAction;
    setBulkAction(action);
    const isDestructive = BULK_OPTIONS.find((o) => o.value === action)?.destructive;
    if (isDestructive) setBulkConfirm(true);
    else void handleBulkApply();
  }

  async function handleReorder(sub: SubService, direction: 'up' | 'down') {
    const ordered = [...(data?.items ?? [])];
    const index = ordered.findIndex((s) => s.id === sub.id);
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || swap < 0 || swap >= ordered.length) return;
    [ordered[index], ordered[swap]] = [ordered[swap], ordered[index]];
    try {
      await reorderMutation.mutateAsync(ordered.map((s) => s.id));
      toast({ title: 'Order updated', description: 'Sub-service order saved.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not reorder sub-services',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    const { kind } = confirm;
    try {
      let message = '';
      if (kind === 'archive') {
        const updated = await archiveMutation.mutateAsync();
        message = `"${updated.name}" stays on historical records but is hidden from the public site.`;
      } else if (kind === 'restore') {
        const updated = await restoreMutation.mutateAsync();
        message = `"${updated.name}" is visible again.`;
      } else if (kind === 'delete') {
        const updated = await softDeleteMutation.mutateAsync();
        message = `"${updated.name}" is hidden everywhere but can be restored any time.`;
      } else {
        const updated = await undeleteMutation.mutateAsync();
        message = `"${updated.name}" is visible again.`;
      }
      toast({ title: 'Sub-service updated', description: message, variant: 'success' });
      setConfirm(null);
    } catch (err) {
      toast({
        title: 'Could not update sub-service',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  const columns = useMemo<ColumnDef<SubService, any>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            checked={currentIds.length > 0 && currentIds.every((id) => selected.has(id))}
            onCheckedChange={(checked) => toggleSelectAll(checked === true)}
            aria-label="Select all sub-services on this page"
          />
        ),
        cell: (info) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected.has(info.row.original.id)}
              onCheckedChange={(checked) => toggleSelected(info.row.original.id, checked === true)}
              aria-label={`Select ${info.row.original.name}`}
            />
          </div>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Sub Service',
        cell: (info) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
              <ServiceIcon name={info.row.original.icon ?? undefined} className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">{info.getValue()}</p>
              {info.row.original.shortDescription && (
                <p className="max-w-xs truncate text-xs text-ink-faint">{info.row.original.shortDescription}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: (info) => (
          <span className="font-mono text-xs text-ink-muted">/{info.getValue()}</span>
        ),
      },
      {
        accessorKey: 'startingPrice',
        header: 'Starting Price',
        cell: (info) => (
          <span className="text-ink-muted">{info.getValue() || '—'}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (info) => (
          <div className="flex items-center gap-1.5">
            <SubServiceStatusPill sub={info.row.original} />
            <PublicationStatePill publicationState={info.row.original.publicationState} />
          </div>
        ),
      },
      {
        accessorKey: 'sortOrder',
        header: 'Sort',
        cell: (info) => {
          const value = info.getValue();
          return <span className="text-ink-muted">{value != null ? String(value) : '—'}</span>;
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
    [selected, currentIds]
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchInput
            placeholder="Search sub-services by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onClear={() => setSearch('')}
            className="max-w-sm"
          />
          <Button size="sm" onClick={createDrawer.open}>
            <Plus className="h-3.5 w-3.5" /> New Sub Service
          </Button>
        </div>

        <FilterBar
          activeFilters={activeFilters}
          onRemoveFilter={(key) => {
            if (key === 'status') setStatus('ALL');
            if (key === 'publication') setPublication('ALL');
            setPage(1);
          }}
          onClearAll={
            activeFilters.length
              ? () => {
                  setStatus('ALL');
                  setPublication('ALL');
                  setPage(1);
                }
              : undefined
          }
        >
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as SubServiceStatusFilter);
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
            value={publication}
            onValueChange={(value) => {
              setPublication(value as PublicationFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Publication" />
            </SelectTrigger>
            <SelectContent>
              {PUBLICATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5 shadow-xs">
          <span className="text-sm font-medium text-ink">
            {selected.size} selected
            <button
              onClick={() => setSelected(new Set())}
              className="ml-2 inline-flex items-center gap-1 text-xs text-ink-faint transition-colors hover:text-danger"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Select value={bulkAction} onValueChange={handleBulkSelect}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Bulk action" />
              </SelectTrigger>
              <SelectContent>
                {BULK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(sub) => {
          setEditing(sub);
          editDrawer.open();
        }}
        emptyTitle={search || activeFilters.length ? 'No sub-services match your filters' : 'No sub-services yet'}
        emptyDescription={
          search || activeFilters.length
            ? 'Try a different search term or clear the filters.'
            : 'Add sub-services under this service — each gets its own SEO URL and public detail page.'
        }
        pagination={
          data?.meta && data.meta.totalPages > 1
            ? {
                page: data.meta.page,
                totalPages: data.meta.totalPages,
                total: data.meta.total,
                pageSize: data.meta.pageSize,
                onPageChange: setPage,
              }
            : undefined
        }
        rowActions={(sub) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {!sub.deletedAt && (
              <>
                {canReorder && (
                  <>
                    <button
                      onClick={() => handleReorder(sub, 'up')}
                      disabled={reorderMutation.isPending}
                      title="Move up"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-accent disabled:opacity-50"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleReorder(sub, 'down')}
                      disabled={reorderMutation.isPending}
                      title="Move down"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-accent disabled:opacity-50"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                {sub.publicationState === 'DRAFT' && !sub.archivedAt && (
                  <SubPublishButton sub={sub} serviceRef={serviceRef} />
                )}
                {sub.publicationState !== 'DRAFT' && !sub.archivedAt && (
                  <SubDraftButton sub={sub} serviceRef={serviceRef} />
                )}
                <button
                  onClick={() => {
                    setEditing(sub);
                    editDrawer.open();
                  }}
                  title="Edit"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-accent"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {!sub.archivedAt && (
                  <button
                    onClick={() => setConfirm({ sub, kind: 'archive' })}
                    title="Archive"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-amber-600"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                )}
                {sub.archivedAt && (
                  <button
                    onClick={() => setConfirm({ sub, kind: 'restore' })}
                    title="Restore"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-accent"
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setConfirm({ sub, kind: 'delete' })}
                  title="Delete"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {sub.deletedAt && (
              <button
                onClick={() => setConfirm({ sub, kind: 'undelete' })}
                title="Restore deleted"
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-accent"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      />

      {!canReorder && !isLoading && (data?.items.length ?? 0) > 1 && (
        <p className="mt-2 text-xs text-ink-faint">
          Clear the search and status filters to reorder sub-services.
        </p>
      )}

      <SubServiceFormDrawer
        open={createDrawer.isOpen}
        onOpenChange={createDrawer.setIsOpen}
        serviceRef={serviceRef}
      />

      <SubServiceFormDrawer
        open={editDrawer.isOpen}
        onOpenChange={(open) => {
          editDrawer.setIsOpen(open);
          if (!open) setEditing(undefined);
        }}
        serviceRef={serviceRef}
        subService={editing}
      />

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirm(null);
          }}
          title={CONFIRM_LABELS[confirm.kind].title}
          description={`"${confirm.sub.name}" — ${
            confirm.kind === 'archive'
              ? 'archiving hides it from the public site while keeping it on historical records.'
              : confirm.kind === 'delete'
                ? 'deleting hides it everywhere, but you can restore it from the Deleted filter any time.'
                : 'restoring brings it back into view immediately.'
          }`}
          confirmLabel={CONFIRM_LABELS[confirm.kind].confirm}
          destructive={CONFIRM_LABELS[confirm.kind].destructive}
          loading={
            archiveMutation.isPending ||
            restoreMutation.isPending ||
            softDeleteMutation.isPending ||
            undeleteMutation.isPending
          }
          onConfirm={handleConfirm}
        />
      )}

      <ConfirmDialog
        open={bulkConfirm}
        onOpenChange={(open) => {
          setBulkConfirm(open);
          if (!open) setBulkAction('');
        }}
        title="Confirm bulk action"
        description={`This will ${BULK_OPTIONS.find((o) => o.value === bulkAction)?.label.toLowerCase() ?? 'update'} ${selected.size} selected sub-service(s). This cannot be undone.`}
        confirmLabel="Confirm"
        destructive={BULK_OPTIONS.find((o) => o.value === bulkAction)?.destructive}
        loading={bulkMutation.isPending}
        onConfirm={handleBulkApply}
      />
    </div>
  );
}
