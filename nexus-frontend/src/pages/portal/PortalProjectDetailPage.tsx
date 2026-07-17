import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Download, FileText, FolderOpen, MessageSquare, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { EntityTimeline } from '@/components/common/EntityTimeline';
import { useToast } from '@/hooks/useToast';
import { useMyProject, useProjectDocuments } from '@/queries/useProjects';
import { useMyInvoices } from '@/queries/useInvoices';
import { documentService } from '@/services/documentService';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { NexusDocument, Project, ProjectService } from '@/types';

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <div className="mt-0.5 text-sm text-ink">{value || '-'}</div>
    </div>
  );
}

function ServiceProgress({ service }: { service: ProjectService }) {
  const percentage = service.progressPercentage ?? 0;
  return (
    <li className="px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink">{service.service?.name ?? 'Service'}</p>
          <p className="text-xs text-ink-faint">{service.service?.category?.name ?? 'Catalog service'}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={service.status} />
          <div className="w-28">
            <div className="mb-1 flex justify-between text-xs text-ink-muted">
              <span>{percentage}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-canvas ring-1 ring-inset ring-border">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percentage}%` }} />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function ProjectOverview({ project }: { project: Project }) {
  const quotation = project.quotations?.[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Project number" value={<span className="font-mono">{project.projectNumber}</span>} />
          <Field label="Status" value={<StatusBadge status={project.aggregateStatus ?? 'NO SERVICES'} />} />
          <Field label="Created" value={formatDateTime(project.createdAt)} />
          <Field label="Progress" value={`${project.completionPercentage ?? 0}%`} />
          <Field
            label="Services"
            value={`${project.completedServices ?? 0} of ${project.totalServices ?? 0} completed`}
          />
          <Field label="Linked quotation" value={quotation?.quotationNumber ?? '-'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quotation ? (
            <Link
              to={ROUTES.portal.quotationDetail(quotation.id)}
              className="flex items-center justify-between rounded border border-border bg-canvas px-3 py-2 text-sm hover:bg-surface"
            >
              <span>
                <span className="block font-medium text-ink">{quotation.quotationNumber}</span>
                <span className="text-xs text-ink-faint">
                  Version {quotation.versionNumber} · {formatCurrency(quotation.grandTotal)}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-ink-faint" />
            </Link>
          ) : (
            <p className="text-sm text-ink-muted">No quotation linked to this project yet.</p>
          )}
          <Link
            to={ROUTES.portal.messages}
            className="flex items-center justify-between rounded border border-border bg-canvas px-3 py-2 text-sm hover:bg-surface"
          >
            <span className="inline-flex items-center gap-2 font-medium text-ink">
              <MessageSquare className="h-4 w-4" /> Ask about this project
            </span>
            <ChevronRight className="h-4 w-4 text-ink-faint" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectInvoices({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, refetch } = useMyInvoices();
  const invoices = useMemo(() => (data ?? []).filter((invoice) => invoice.projectId === projectId), [data, projectId]);

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (isError) return <ErrorState description="Couldn't load invoices for this project." onRetry={refetch} />;
  if (invoices.length === 0) {
    return <EmptyState icon={Receipt} title="No invoices yet" description="Invoices for this project will appear here once issued." />;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {invoices.map((invoice) => (
        <li key={invoice.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-sm font-medium text-ink">{invoice.invoiceNumber}</p>
            <p className="text-xs text-ink-faint">
              {invoice.label} · Issued {formatDate(invoice.issuedAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={invoice.displayStatus ?? invoice.status} />
            <span className="text-sm font-medium text-ink">{formatCurrency(invoice.grandTotal)}</span>
            <Button variant="secondary" size="sm" asChild>
              <Link to={ROUTES.portal.invoiceDetail(invoice.id)}>View</Link>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProjectDocuments({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, refetch } = useProjectDocuments(projectId);
  const { toast } = useToast();

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

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (isError) return <ErrorState description="Couldn't load project documents." onRetry={refetch} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No documents yet"
        description="Contracts, drawings, reports, and other files shared by the business will appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {data.map((document) => (
        <li key={document.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink">{document.fileName}</p>
            <p className="text-xs text-ink-faint">
              {document.documentType.replace(/_/g, ' ')} · {formatDate(document.createdAt)}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => handleDownload(document)}>
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function PortalProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, isError, refetch } = useMyProject(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !project) {
    return <ErrorState description="Couldn't load this project." onRetry={refetch} />;
  }

  const services = project.projectServices ?? [];

  return (
    <div>
      <PageHeader
        title={project.projectNumber}
        description="Progress, billing, and documents for this project - updated by the business as work moves forward."
        actions={<StatusBadge status={project.aggregateStatus ?? 'NO SERVICES'} />}
      />

      <Card>
        <CardContent className="pt-5">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-5">
              <ProjectOverview project={project} />
            </TabsContent>

            <TabsContent value="services" className="pt-5">
              {services.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No services yet"
                  description="Services are added to this project by the business."
                />
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {services.map((service) => (
                    <ServiceProgress key={service.id} service={service} />
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="invoices" className="pt-5">
              <ProjectInvoices projectId={project.id} />
            </TabsContent>

            <TabsContent value="documents" className="pt-5">
              <ProjectDocuments projectId={project.id} />
            </TabsContent>

            <TabsContent value="timeline" className="pt-5">
              <EntityTimeline entityType="PROJECT" entityId={project.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
