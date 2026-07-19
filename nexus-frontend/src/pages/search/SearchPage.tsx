import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, FolderKanban, FolderOpen, Receipt, Search, Users, UserSquare2, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDebounce } from '@/hooks/useDebounce';
import { useGlobalSearch } from '@/queries/useSearch';
import { ROUTES } from '@/routes/routes';

const MIN_QUERY_LENGTH = 2;

function ResultGroup({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: LucideIcon;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Icon className="h-4 w-4 text-ink-faint" /> {title}
            <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-normal text-ink-muted ring-1 ring-border">
              {count}
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border rounded-lg border border-border">{children}</ul>
      </CardContent>
    </Card>
  );
}

function ResultRow({ to, primary, secondary, badge }: { to: string; primary: string; secondary?: string; badge?: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-canvas">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{primary}</p>
          {secondary && <p className="truncate text-xs text-ink-faint">{secondary}</p>}
        </div>
        {badge && <StatusBadge status={badge} />}
      </Link>
    </li>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const debouncedQuery = useDebounce(query, 350);

  const { data, isLoading, isError, refetch } = useGlobalSearch(debouncedQuery);

  const totalResults = useMemo(() => {
    if (!data) return 0;
    return (
      data.leads.length +
      data.clients.length +
      data.projects.length +
      data.quotations.length +
      data.invoices.length +
      data.services.length +
      data.documents.length
    );
  }, [data]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setSearchParams(value ? { q: value } : {}, { replace: true });
  }

  const isSearchable = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div>
      <PageHeader
        title="Search"
        description="Find leads, clients, projects, quotations, invoices, and documents by number, name, phone, or email."
      />

      <div className="mb-6">
        <SearchInput
          autoFocus
          placeholder="Search everything... (min 2 characters)"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onClear={() => handleQueryChange('')}
          className="max-w-xl"
        />
      </div>

      {!isSearchable ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Search}
              title="Start typing to search"
              description="Results are grouped by record type - lead numbers, client names, phone numbers, invoice numbers, file names, and more."
            />
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError ? (
        <ErrorState description="Search failed." onRetry={refetch} />
      ) : !data || totalResults === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Search}
              title={`No results for "${debouncedQuery}"`}
              description="Try a lead/project/invoice number, a client name, phone, or email."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <ResultGroup title="Leads" icon={Users} count={data.leads.length}>
            {data.leads.map((lead) => (
              <ResultRow
                key={lead.id}
                to={ROUTES.leadDetail(lead.id)}
                primary={`${lead.leadNumber} — ${lead.contactName}`}
                secondary={[lead.companyName, lead.phone, lead.email].filter(Boolean).join(' · ')}
              />
            ))}
          </ResultGroup>

          <ResultGroup title="Clients" icon={UserSquare2} count={data.clients.length}>
            {data.clients.map((client) => (
              <ResultRow
                key={client.id}
                to={ROUTES.clientDetail(client.id)}
                primary={`${client.clientNumber} — ${client.companyName || client.contactName}`}
                secondary={[client.contactName, client.phone, client.email].filter(Boolean).join(' · ')}
              />
            ))}
          </ResultGroup>

          <ResultGroup title="Projects" icon={FolderKanban} count={data.projects.length}>
            {data.projects.map((project) => (
              <ResultRow key={project.id} to={ROUTES.projectDetail(project.id)} primary={project.projectNumber} />
            ))}
          </ResultGroup>

          <ResultGroup title="Quotations" icon={FileText} count={data.quotations.length}>
            {data.quotations.map((quotation) => (
              <ResultRow
                key={quotation.id}
                to={ROUTES.quotationDetail(quotation.id)}
                primary={quotation.quotationNumber}
                badge={quotation.status}
              />
            ))}
          </ResultGroup>

          <ResultGroup title="Invoices" icon={Receipt} count={data.invoices.length}>
            {data.invoices.map((invoice) => (
              <ResultRow
                key={invoice.id}
                to={ROUTES.invoiceDetail(invoice.id)}
                primary={invoice.invoiceNumber}
                secondary={invoice.label}
                badge={invoice.status}
              />
            ))}
          </ResultGroup>

          <ResultGroup title="Services" icon={Wrench} count={data.services.length}>
            {data.services.map((service) => (
              <ResultRow key={service.id} to={ROUTES.settings} primary={service.name} secondary={service.description ?? undefined} />
            ))}
          </ResultGroup>

          <ResultGroup title="Documents" icon={FolderOpen} count={data.documents.length}>
            {data.documents.map((document) => (
              <ResultRow
                key={document.id}
                to={ROUTES.documents}
                primary={document.fileName}
                secondary={document.documentType.replace(/_/g, ' ').toLowerCase()}
              />
            ))}
          </ResultGroup>
        </div>
      )}
    </div>
  );
}
