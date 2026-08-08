import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Archive, ArchiveRestore, Inbox, MailOpen, MessageSquare, Reply } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterBar, type ActiveFilter } from '@/components/ui/FilterBar';
import { Badge } from '@/components/ui/StatusBadge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import {
  useContactMessagesList,
  useContactMessageCounts,
  useMarkContactMessageRead,
  useReplyContactMessage,
  useArchiveContactMessage,
  useRestoreContactMessage,
} from '@/queries/useContactMessages';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { ContactMessage, ContactMessageStatus } from '@/types';
import type { ContactMessageStatusFilter } from '@/services/contactService';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: ContactMessageStatusFilter; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'READ', label: 'Read' },
  { value: 'REPLIED', label: 'Replied' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function StatusPill({ status }: { status: ContactMessageStatus }) {
  if (status === 'NEW') return <Badge tone="accent">New</Badge>;
  if (status === 'READ') return <Badge tone="neutral">Read</Badge>;
  if (status === 'REPLIED') return <Badge tone="success">Replied</Badge>;
  return <Badge tone="neutral">Archived</Badge>;
}

export function SupportInboxPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ContactMessageStatusFilter>('ALL');
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useContactMessagesList({
    page,
    pageSize: PAGE_SIZE,
    status,
    search: debouncedSearch || undefined,
  });

  const { data: counts } = useContactMessageCounts();

  const markReadMutation = useMarkContactMessageRead(selected?.id ?? '');
  const replyMutation = useReplyContactMessage(selected?.id ?? '');
  const archiveMutation = useArchiveContactMessage(selected?.id ?? '');
  const restoreMutation = useRestoreContactMessage(selected?.id ?? '');

  const activeFilters: ActiveFilter[] = [
    ...(status !== 'ALL'
      ? [{ key: 'status', label: `Status: ${STATUS_OPTIONS.find((o) => o.value === status)?.label}` }]
      : []),
  ];

  const columns = useMemo<ColumnDef<ContactMessage, any>[]>(
    () => [
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: (info) => (
          <div>
            <p className="text-sm font-medium text-ink">{info.getValue()}</p>
            <p className="text-xs text-ink-faint">{info.row.original.name}</p>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'From',
        cell: (info) => <span className="text-ink-muted">{info.getValue()}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        cell: (info) => <StatusPill status={info.row.original.status} />,
      },
      {
        accessorKey: 'createdAt',
        header: 'Received',
        cell: (info) => (
          <span className="text-ink-muted">{info.getValue() ? formatDate(info.getValue()) : '—'}</span>
        ),
      },
    ],
    []
  );

  function openMessage(message: ContactMessage) {
    setSelected(message);
    setReplyDraft('');
    if (message.status === 'NEW') {
      markReadMutation.mutate(undefined, {
        onSuccess: (updated) => setSelected((prev) => (prev && prev.id === updated.id ? updated : prev)),
      });
    }
  }

  async function handleReply() {
    if (!selected || !replyDraft.trim()) return;
    try {
      const updated = await replyMutation.mutateAsync(replyDraft.trim());
      setSelected(updated);
      setReplyDraft('');
      toast({ title: 'Reply sent', description: `Your reply was emailed to ${updated.email}.`, variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not send reply',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleArchiveToggle() {
    if (!selected) return;
    try {
      const updated = selected.status === 'ARCHIVED'
        ? await restoreMutation.mutateAsync()
        : await archiveMutation.mutateAsync();
      setSelected(updated);
      toast({
        title: selected.status === 'ARCHIVED' ? 'Message restored' : 'Message archived',
        description: selected.status === 'ARCHIVED'
          ? 'The message is back in the inbox.'
          : 'The message is hidden from the default view but kept in the database.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Could not update message',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="Support Inbox"
        description="Messages submitted from the public Contact page."
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">
              <Inbox className="h-3.5 w-3.5" /> {counts?.new ?? '—'} new
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-subtle px-3 py-1 text-xs font-medium text-warning">
              <MessageSquare className="h-3.5 w-3.5" /> {counts?.unread ?? '—'} unread
            </span>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <SearchInput
          placeholder="Search by name, email, company, or subject..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onClear={() => setSearch('')}
          className="max-w-sm"
        />

        <FilterBar
          activeFilters={activeFilters}
          onRemoveFilter={(key) => {
            if (key === 'status') setStatus('ALL');
            setPage(1);
          }}
          onClearAll={
            activeFilters.length
              ? () => {
                  setStatus('ALL');
                  setPage(1);
                }
              : undefined
          }
        >
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as ContactMessageStatusFilter);
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
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={openMessage}
        emptyTitle={search || activeFilters.length ? 'No messages match your filters' : 'No messages yet'}
        emptyDescription={
          search || activeFilters.length
            ? 'Try a different search term or clear the filters.'
            : 'Messages submitted through the public Contact page appear here.'
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

      <Modal open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <ModalContent
          title={selected?.subject ?? 'Message'}
          description={selected ? `From ${selected.name} · ${formatDate(selected.createdAt)}` : undefined}
          className="max-w-2xl"
        >
          {selected ? (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-xl border border-border bg-canvas/50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Email</p>
                  <p className="mt-0.5 text-ink">
                    <a href={`mailto:${selected.email}`} className="text-accent hover:underline">
                      {selected.email}
                    </a>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Phone</p>
                  <p className="mt-0.5 text-ink">{selected.phone || '—'}</p>
                </div>
                {selected.company && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Company</p>
                    <p className="mt-0.5 text-ink">{selected.company}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Status</p>
                  <div className="mt-0.5">
                    <StatusPill status={selected.status} />
                  </div>
                </div>
              </div>

              <div className="whitespace-pre-line rounded-xl border border-border p-4 text-sm leading-relaxed text-ink">
                {selected.message}
              </div>

              {selected.replyBody && (
                <div className="rounded-xl border border-success/30 bg-success-subtle/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-success">
                    Your reply · {selected.repliedAt ? formatDate(selected.repliedAt) : ''}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{selected.replyBody}</p>
                </div>
              )}

              {selected.status !== 'ARCHIVED' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Reply to {selected.name}</label>
                  <Textarea
                    rows={4}
                    value={replyDraft}
                    placeholder="Write your response — it will be emailed to the visitor."
                    onChange={(e) => setReplyDraft(e.target.value)}
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2">
                {selected.status === 'NEW' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={markReadMutation.isPending}
                    onClick={() =>
                      markReadMutation.mutate(undefined, {
                        onSuccess: (updated) => setSelected(updated),
                      })
                    }
                  >
                    <MailOpen className="h-3.5 w-3.5" /> Mark as read
                  </Button>
                )}
                {selected.status !== 'ARCHIVED' && (
                  <Button variant="secondary" size="sm" loading={archiveMutation.isPending} onClick={handleArchiveToggle}>
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </Button>
                )}
                {selected.status === 'ARCHIVED' && (
                  <Button variant="secondary" size="sm" loading={restoreMutation.isPending} onClick={handleArchiveToggle}>
                    <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                  </Button>
                )}
                {selected.status !== 'ARCHIVED' && (
                  <Button
                    size="sm"
                    loading={replyMutation.isPending}
                    disabled={!replyDraft.trim()}
                    onClick={handleReply}
                  >
                    <Reply className="h-3.5 w-3.5" /> Send reply
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
