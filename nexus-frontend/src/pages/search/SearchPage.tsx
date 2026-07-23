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
import type { SearchEntityType } from '@/services/searchService';

const MIN_QUERY_LENGTH = 2;

const MODULE_FILTERS: { key: SearchEntityType | 'all'; label: string; icon: LucideIcon }[] = [
  { key: 'all', label: 'All', icon: Search },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'clients', label: 'Clients', icon: UserSquare2 },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'quotations', label: 'Quotations', icon: FileText },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'services', label: 'Services', icon: Wrench },
  { key: 'documents', label: 'Documents', icon: FolderOpen },
];

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="rounded bg-warning-subtle px-0.5 text-ink">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

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

function ResultRow({
  to,
  primary,
  secondary,
  badge,
  query,
  onClick,
}: {
  to: string;
  primary: string;
  secondary?: string;
  badge?: string;
  query?: string;
  onClick?: () => void;
}) {
  return (
    <li>
      <Link
        to={to}
        onClick={onClick}
        className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-canvas"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">
            {query ? <Highlight text={primary} query={query} /> : primary}
          </p>
          {secondary && (
            <p className="truncate text-xs text-ink-faint">
              {query ? <Highlight text={secondary} query={query} /> : secondary}
            </p>
          )}
        </div>
        {badge && <StatusBadge status={badge} />}
      </Link>
    </li>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [activeFilter, setActiveFilter] = useState<SearchEntityType | 'all'>(
    (searchParams.get('type') as SearchEntityType | 'all') || 'all'
  );
  const debouncedQuery = useDebounce(query, 350);

  const typeParam = activeFilter === 'all' ? undefined : activeFilter;
  const { data, isLoading, isError, refetch } = useGlobalSearch(debouncedQuery, typeParam);

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
    const params: Record<string, string> = {};
    if (value) params.q = value;
    if (activeFilter !== 'all') params.type = activeFilter;
    setSearchParams(params, { replace: true });
  }

  function handleFilterChange(filter: SearchEntityType | 'all') {
    setActiveFilter(filter);
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (filter !== 'all') params.type = filter;
    setSearchParams(params, { replace: true });
  }

  const isSearchable = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div>
      <PageHeader
        title="Search"
        description="Find leads, clients, projects, quotations, invoices, services, and documents."
      />

      <div className="mb-4">
        <SearchInput
          autoFocus
          placeholder="Search everything... (min 2 characters)"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onClear={() => handleQueryChange('')}
          className="max-w-xl"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {MODULE_FILTERS.map((filter) => {
          const FilterIcon = filter.icon;
          const isActive = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => handleFilterChange(filter.key)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-subtle text-accent'
                  : 'text-ink-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              <FilterIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {filter.label}
            </button>
          );
        })}
      </div>

      {!isSearchable ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Search}
              title="Start typing to search"
              description="Results are grouped by record type — lead numbers, client names, phone numbers, invoice numbers, file names, and more. Use the filters above to narrow by module."
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
              description="Try a lead/project/invoice number, a client name, phone, email, or service name."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(activeFilter === 'all' || activeFilter === 'leads') && (
            <ResultGroup title="Leads" icon={Users} count={data.leads.length}>
              {data.leads.map((lead) => (
                <ResultRow
                  key={lead.id}
                  to={ROUTES.admin.leadDetail(lead.id)}
                  primary={`${lead.leadNumber} — ${lead.contactName}`}
                  secondary={[lead.companyName, lead.phone, lead.email].filter(Boolean).join(' · ')}
                  query={debouncedQuery}
                />
              ))}
            </ResultGroup>
          )}

          {(activeFilter === 'all' || activeFilter === 'clients') && (
            <ResultGroup title="Clients" icon={UserSquare2} count={data.clients.length}>
              {data.clients.map((client) => (
                <ResultRow
                  key={client.id}
                  to={ROUTES.admin.clientDetail(client.id)}
                  primary={`${client.clientNumber} — ${client.companyName || client.contactName}`}
                  secondary={[client.contactName, client.phone, client.email].filter(Boolean).join(' · ')}
                  query={debouncedQuery}
                />
              ))}
            </ResultGroup>
          )}

          {(activeFilter === 'all' || activeFilter === 'projects') && (
            <ResultGroup title="Projects" icon={FolderKanban} count={data.projects.length}>
              {data.projects.map((project) => (
                <ResultRow
                  key={project.id}
                  to={ROUTES.admin.projectDetail(project.id)}
                  primary={project.projectNumber}
                  secondary={project.client ? `${project.client.contactName}${project.client.companyName ? ` · ${project.client.companyName}` : ''}` : undefined}
                  query={debouncedQuery}
                />
              ))}
            </ResultGroup>
          )}

          {(activeFilter === 'all' || activeFilter === 'quotations') && (
            <ResultGroup title="Quotations" icon={FileText} count={data.quotations.length}>
              {data.quotations.map((quotation) => (
                <ResultRow
                  key={quotation.id}
                  to={ROUTES.admin.quotationDetail(quotation.id)}
                  primary={quotation.quotationNumber}
                  secondary={quotation.client ? `${quotation.client.contactName}${quotation.client.companyName ? ` · ${quotation.client.companyName}` : ''}` : undefined}
                  badge={quotation.status}
                  query={debouncedQuery}
                />
              ))}
            </ResultGroup>
          )}

          {(activeFilter === 'all' || activeFilter === 'invoices') && (
            <ResultGroup title="Invoices" icon={Receipt} count={data.invoices.length}>
              {data.invoices.map((invoice) => (
                <ResultRow
                  key={invoice.id}
                  to={ROUTES.admin.invoiceDetail(invoice.id)}
                  primary={invoice.invoiceNumber}
                  secondary={[invoice.label, invoice.client?.contactName, invoice.project?.projectNumber].filter(Boolean).join(' · ')}
                  badge={invoice.status}
                  query={debouncedQuery}
                />
              ))}
            </ResultGroup>
          )}

          {(activeFilter === 'all' || activeFilter === 'services') && (
            <ResultGroup title="Services" icon={Wrench} count={data.services.length}>
              {data.services.map((service) => (
                <ResultRow
                  key={service.id}
                  to={ROUTES.admin.serviceDetail(service.id)}
                  primary={service.name}
                  secondary={[service.category?.name, service.description].filter(Boolean).join(' · ')}
                  query={debouncedQuery}
                />
              ))}
            </ResultGroup>
          )}

          {(activeFilter === 'all' || activeFilter === 'documents') && (
            <ResultGroup title="Documents" icon={FolderOpen} count={data.documents.length}>
              {data.documents.map((document) => (
                <ResultRow
                  key={document.id}
                  to={ROUTES.admin.documents}
                  primary={document.fileName}
                  secondary={[
                    document.documentType.replace(/_/g, ' ').toLowerCase(),
                    (document as any).client?.contactName,
                    (document as any).projectRef?.projectNumber,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  query={debouncedQuery}
                />
              ))}
            </ResultGroup>
          )}
        </div>
      )}
    </div>
  );
}
