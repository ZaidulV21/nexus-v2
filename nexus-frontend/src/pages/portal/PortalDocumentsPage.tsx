import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, FileImage, FileText, FolderOpen } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import { useMyDocuments } from '@/queries/useDocuments';
import { documentService } from '@/services/documentService';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { NexusDocument } from '@/types';

const FILTER_ALL = 'all';

function formatDocumentType(documentType: string) {
  return documentType.replace(/_/g, ' ').toLowerCase();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentIcon({ mimeType }: { mimeType: string }) {
  const Icon = mimeType.startsWith('image/') ? FileImage : FileText;
  return <Icon className="h-4 w-4 shrink-0 text-ink-faint" />;
}

export function PortalDocumentsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(FILTER_ALL);
  const { data, isLoading, isError, refetch } = useMyDocuments();
  const { toast } = useToast();

  const typeOptions = useMemo(
    () => Array.from(new Set((data ?? []).map((document) => document.documentType))).sort(),
    [data]
  );

  const documents = useMemo(() => {
    let items = data ?? [];
    if (typeFilter !== FILTER_ALL) {
      items = items.filter((document) => document.documentType === typeFilter);
    }
    if (search) {
      const term = search.toLowerCase();
      items = items.filter(
        (document) =>
          document.fileName.toLowerCase().includes(term) ||
          formatDocumentType(document.documentType).includes(term)
      );
    }
    return items;
  }, [data, search, typeFilter]);

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

  const columns = useMemo<ColumnDef<NexusDocument, any>[]>(
    () => [
      {
        accessorKey: 'fileName',
        header: 'Document',
        cell: (info) => (
          <div className="flex items-center gap-2.5">
            <DocumentIcon mimeType={info.row.original.mimeType} />
            <div>
              <p className="text-sm font-medium text-ink">{info.getValue()}</p>
              <p className="text-xs capitalize text-ink-faint">{formatDocumentType(info.row.original.documentType)}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'fileSize',
        header: 'Size',
        cell: (info) => <span className="text-ink-muted">{formatFileSize(info.getValue())}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Shared',
        cell: (info) => <span className="text-ink-muted">{formatDate(info.getValue())}</span>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Contracts, quotations, drawings, and reports shared with you by the business. Read-only."
        actions={
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            <FolderOpen className="h-4 w-4" /> Client view
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          className="max-w-sm"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>All types</SelectItem>
            {typeOptions.map((type) => (
              <SelectItem key={type} value={type}>
                <span className="capitalize">{formatDocumentType(type)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={documents}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyTitle={search || typeFilter !== FILTER_ALL ? 'No documents match your filters' : 'No documents yet'}
        emptyDescription={
          search || typeFilter !== FILTER_ALL
            ? 'Try a different search term or filter.'
            : 'Documents shared by the business will appear here.'
        }
        rowActions={(row) => (
          <Button variant="secondary" size="sm" onClick={() => handleDownload(row)}>
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
        )}
      />
    </div>
  );
}
