import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, FileImage, FileText, Eye, Trash2, Upload, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer, DrawerContent } from '@/components/ui/Drawer';
import { FormField } from '@/components/ui/FormField';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useDebounce } from '@/hooks/useDebounce';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useToast } from '@/hooks/useToast';
import { useAllDocuments, useDeleteDocument, useUploadDocument } from '@/queries/useDocuments';
import { useLeadsList } from '@/queries/useLeads';
import { useProjectsList } from '@/queries/useProjects';
import { documentService } from '@/services/documentService';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import { cn } from '@/lib/utils';
import type { NexusDocument } from '@/types';

const PAGE_SIZE = 20;
const FILTER_ALL = 'all';

/** Mirrors the backend's DOCUMENT_TYPES list (documents.types.ts). Kept as
 *  a display map only - the backend still validates the actual value. */
const DOCUMENT_TYPES = [
  'DRAWING',
  'IMAGE',
  'REQUIREMENT_PDF',
  'CONTRACT',
  'QUOTATION',
  'SITE_PHOTO',
  'COMPLETION_REPORT',
  'WARRANTY',
  'OTHER',
] as const;

function formatDocumentType(documentType: string) {
  return documentType.replace(/_/g, ' ').toLowerCase();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentPreviewModal({
  document,
  open,
  onOpenChange,
}: {
  document: NexusDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch download URL when document changes
  useEffect(() => {
    if (!document || !open) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    documentService
      .getDownload(document.id)
      .then((result) => {
        if (!cancelled) {
          setPreviewUrl(result.url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [document?.id, open]);

  const isImage = document?.mimeType.startsWith('image/');
  const isPdf = document?.mimeType === 'application/pdf';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-[2px] animate-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface-raised p-0 shadow-lg animate-scale-in',
            'max-h-[90vh] flex flex-col'
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold text-ink">
                {document?.fileName ?? 'Preview'}
              </DialogPrimitive.Title>
              {document && (
                <p className="mt-0.5 text-xs text-ink-muted">
                  {formatDocumentType(document.documentType)} · {formatFileSize(document.fileSize)}
                </p>
              )}
            </div>
            <DialogPrimitive.Close className="rounded p-1 text-ink-faint transition-colors hover:bg-canvas hover:text-ink">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-auto p-6">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            )}
            {!loading && !previewUrl && (
              <div className="flex items-center justify-center py-20 text-ink-muted">Unable to load preview</div>
            )}
            {!loading && previewUrl && isImage && (
              <img
                src={previewUrl}
                alt={document?.fileName ?? 'Preview'}
                className="mx-auto max-h-[70vh] rounded object-contain"
              />
            )}
            {!loading && previewUrl && isPdf && (
              <iframe
                src={previewUrl}
                title={document?.fileName ?? 'PDF Preview'}
                className="h-[70vh] w-full rounded border-0"
              />
            )}
            {!loading && previewUrl && !isImage && !isPdf && (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-ink-muted">
                <FileText className="h-12 w-12" />
                <p>Preview not available for this file type.</p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                >
                  <Download className="h-3.5 w-3.5" /> Open in new tab
                </Button>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function UploadDocumentDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const uploadDocument = useUploadDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entityType, setEntityType] = useState<'LEAD' | 'PROJECT'>('PROJECT');
  const [entityId, setEntityId] = useState('');
  const [documentType, setDocumentType] = useState<string>('OTHER');
  const [file, setFile] = useState<File | null>(null);

  // Lightweight pickers: first page of leads/projects is enough for the
  // common case; the backend list endpoints already support search if
  // this ever needs a typeahead.
  const { data: leads } = useLeadsList({ page: 1, pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' });
  const { data: projects } = useProjectsList({ page: 1, pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' });

  const targets =
    entityType === 'LEAD'
      ? (leads?.items ?? []).map((lead) => ({ id: lead.id, label: `${lead.leadNumber} — ${lead.contactName}` }))
      : (projects?.items ?? []).map((project) => ({
          id: project.id,
          label: `${project.projectNumber} — ${project.client?.companyName || project.client?.contactName || ''}`,
        }));

  function reset() {
    setEntityId('');
    setDocumentType('OTHER');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleUpload() {
    if (!file || !entityId) return;
    try {
      await uploadDocument.mutateAsync({ entityType, entityId, documentType, file });
      toast({ title: 'Document uploaded', variant: 'success' });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent title="Upload document" description="Attach a file to a Lead or Project. Clients see Project documents in their portal.">
        <div className="flex flex-col gap-4">
          <FormField label="Attach to" htmlFor="doc-entity-type" required>
            <Select
              value={entityType}
              onValueChange={(value) => {
                setEntityType(value as 'LEAD' | 'PROJECT');
                setEntityId('');
              }}
            >
              <SelectTrigger id="doc-entity-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROJECT">Project</SelectItem>
                <SelectItem value="LEAD">Lead</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label={entityType === 'LEAD' ? 'Lead' : 'Project'} htmlFor="doc-entity-id" required>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger id="doc-entity-id">
                <SelectValue placeholder={`Select a ${entityType.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {targets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    {target.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Document type" htmlFor="doc-type" required>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="doc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <span className="capitalize">{formatDocumentType(type)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="File" htmlFor="doc-file" required hint="PDF, JPEG, PNG, or WebP - up to 15MB">
            <input
              ref={fileInputRef}
              id="doc-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-accent-subtle file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-accent"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpload} disabled={!file || !entityId} loading={uploadDocument.isPending}>
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function DocumentsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(FILTER_ALL);
  const [entityFilter, setEntityFilter] = useState(FILTER_ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<NexusDocument | null>(null);
  const [previewTarget, setPreviewTarget] = useState<NexusDocument | null>(null);
  const debouncedSearch = useDebounce(search, 350);
  const uploadDrawer = useDisclosure(false);
  const deleteDocument = useDeleteDocument();

  const { data, isLoading, isError, refetch } = useAllDocuments({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    documentType: typeFilter === FILTER_ALL ? undefined : typeFilter,
    entityType: entityFilter === FILTER_ALL ? undefined : entityFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  async function handleDownload(document: NexusDocument) {
    try {
      const result = await documentService.getDownload(document.id);
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast({
        title: 'Could not open document',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  function handlePreview(document: NexusDocument) {
    setPreviewTarget(document);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDocument.mutateAsync(deleteTarget.id);
      toast({ title: 'Document removed', variant: 'success' });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: 'Could not remove document',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  const columns = useMemo<ColumnDef<NexusDocument, any>[]>(
    () => [
      {
        accessorKey: 'fileName',
        header: 'Document',
        cell: (info) => {
          const Icon = info.row.original.mimeType.startsWith('image/') ? FileImage : FileText;
          return (
            <div className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 shrink-0 text-ink-faint" />
              <div>
                <p className="text-sm font-medium text-ink">{info.getValue()}</p>
                <p className="text-xs capitalize text-ink-faint">{formatDocumentType(info.row.original.documentType)}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'linkedTo',
        header: 'Linked to',
        cell: (info) => {
          const document = info.row.original as NexusDocument & {
            projectRef?: { id: string; projectNumber: string } | null;
          };
          if (document.entityType === 'PROJECT') {
            return (
              <Link
                to={ROUTES.projectDetail(document.entityId)}
                className="font-mono text-sm text-accent hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {document.projectRef?.projectNumber ?? 'Project'}
              </Link>
            );
          }
          return (
            <Link
              to={ROUTES.leadDetail(document.entityId)}
              className="font-mono text-sm text-accent hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              Lead
            </Link>
          );
        },
      },
      {
        accessorKey: 'fileSize',
        header: 'Size',
        cell: (info) => <span className="text-ink-muted">{formatFileSize(info.getValue())}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Uploaded',
        cell: (info) => <span className="text-ink-muted">{formatDate(info.getValue())}</span>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Files attached to leads and projects. Project documents are visible to their client in the portal."
        actions={
          <Button size="sm" onClick={uploadDrawer.open}>
            <Upload className="h-3.5 w-3.5" /> Upload document
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder="Search by file name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onClear={() => setSearch('')}
          className="max-w-sm"
        />
        <Select
          value={entityFilter}
          onValueChange={(value) => {
            setEntityFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>All entities</SelectItem>
            <SelectItem value="LEAD">Leads</SelectItem>
            <SelectItem value="PROJECT">Projects</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(value) => {
            setTypeFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>All types</SelectItem>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                <span className="capitalize">{formatDocumentType(type)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-border bg-canvas px-2 text-sm text-ink"
          />
          <span className="text-xs text-ink-muted">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-border bg-canvas px-2 text-sm text-ink"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyTitle={
          search || typeFilter !== FILTER_ALL || entityFilter !== FILTER_ALL
            ? 'No documents match your filters'
            : 'No documents yet'
        }
        emptyDescription="Upload a document to attach it to a lead or project."
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
        rowActions={(row) => (
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => handlePreview(row)}>
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleDownload(row)}>
              <Download className="h-3.5 w-3.5" /> Open
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)}>
              <Trash2 className="h-3.5 w-3.5 text-danger" />
            </Button>
          </div>
        )}
      />

      <UploadDocumentDrawer open={uploadDrawer.isOpen} onOpenChange={uploadDrawer.setIsOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove document?"
        description={`"${deleteTarget?.fileName}" will be removed from listings. This is a soft delete - the record is preserved for audit purposes.`}
        confirmLabel="Remove"
        destructive
        loading={deleteDocument.isPending}
        onConfirm={handleDelete}
      />

      <DocumentPreviewModal
        document={previewTarget}
        open={!!previewTarget}
        onOpenChange={(open) => !open && setPreviewTarget(null)}
      />
    </div>
  );
}
