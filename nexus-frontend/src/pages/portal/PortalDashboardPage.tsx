import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  FolderKanban,
  FolderOpen,
  MessageSquare,
  PlusCircle,
  Receipt,
  TrendingUp,
  User,
} from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, SkeletonStatCard } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useToast } from '@/hooks/useToast';
import { useClientQuotationsList } from '@/queries/useQuotations';
import { useMyInvoices, useMyInvoiceSummary } from '@/queries/useInvoices';
import { useMyDocuments } from '@/queries/useDocuments';
import { useMessageThread } from '@/queries/useMessages';
import { useNotifications } from '@/queries/useNotifications';
import { useTimeline } from '@/queries/useTimeline';
import { clientService } from '@/services/clientService';
import { documentService } from '@/services/documentService';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDate, formatNumber, formatRelativeTime } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import { dashboardService } from '@/services/dashboardService';
import type { NexusDocument } from '@/types';

function PortalDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}

/** Quotation statuses that are waiting on the client's decision. Derived
 *  from data for display grouping only - the backend still decides which
 *  actions are actually allowed on each quotation. */
const AWAITING_DECISION_STATUSES = new Set(['SENT', 'NEGOTIATION']);

export function PortalDashboardPage() {
  const { actor } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useApiQuery(() => dashboardService.getClientSummary(), []);

  const quotationsQuery = useClientQuotationsList(actor?.id, { page: 1, pageSize: 50 });
  const invoicesQuery = useMyInvoices();
  const invoiceSummaryQuery = useMyInvoiceSummary();
  const documentsQuery = useMyDocuments();
  const messagesQuery = useMessageThread(actor?.id, { pageSize: 100 });

  const clientProfileQuery = useApiQuery(() => clientService.getCurrent(), [actor?.id]);
  const timelineQuery = useTimeline('client', actor?.id);
  const notificationsQuery = useNotifications(1, 5);

  const pendingQuotations = useMemo(
    () => (quotationsQuery.data?.items ?? []).filter((quotation) => AWAITING_DECISION_STATUSES.has(quotation.status)),
    [quotationsQuery.data]
  );

  const outstandingInvoices = useMemo(
    () =>
      (invoicesQuery.data ?? []).filter(
        (invoice) => invoice.status !== 'CANCELLED' && (invoice.outstandingAmount ?? 0) > 0
      ),
    [invoicesQuery.data]
  );
  const totalOutstanding = invoiceSummaryQuery.data?.outstanding ?? outstandingInvoices.reduce((sum, invoice) => sum + (invoice.outstandingAmount ?? 0), 0);

  const recentDocuments = useMemo(() => (documentsQuery.data ?? []).slice(0, 5), [documentsQuery.data]);
  const recentMessages = useMemo(() => (messagesQuery.data?.items ?? []).slice(-3).reverse(), [messagesQuery.data]);

  const upcomingPayments = useMemo(
    () =>
      outstandingInvoices
        .filter((invoice) => invoice.dueDate)
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
        .slice(0, 5),
    [outstandingInvoices]
  );

  const timelineEvents = useMemo(() => (timelineQuery.data ?? []).slice(0, 5), [timelineQuery.data]);
  const recentNotifications = useMemo(() => (notificationsQuery.data?.items ?? []).slice(0, 5), [notificationsQuery.data]);

  const totalInvoiced = invoiceSummaryQuery.data?.totalInvoiced ?? 0;
  const totalPaid = invoiceSummaryQuery.data?.totalPaid ?? 0;
  const totalInvoiceCount = invoiceSummaryQuery.data?.invoiceCount ?? 0;
  const totalDocumentsCount = documentsQuery.data?.length ?? 0;

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

  if (isLoading) {
    return <PortalDashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div>
        <PageHeader title="My Dashboard" description="Overview of your projects, quotations, invoices, and documents." />
        <Card>
          <ErrorState description="Couldn't load your dashboard summary." onRetry={refetch} />
        </Card>
      </div>
    );
  }

  const projects = data.projects;
  const totalProjects = projects.length;
  const completedProjects = projects.filter((project) => project.aggregateStatus === 'Completed').length;
  const activeProjects = projects.filter(
    (project) => project.aggregateStatus !== 'Completed' && project.aggregateStatus !== 'NO SERVICES'
  ).length;
  const recentProjects = projects.slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome${actor?.email ? `, ${actor.email}` : ''}`}
        description="Track project progress, review quotations and invoices, and access your documents in one place."
        actions={
          <>
            <Button variant="secondary" size="sm" asChild>
              <Link to={ROUTES.portal.serviceRequest}>
                <PlusCircle className="h-3.5 w-3.5" /> Request new service
              </Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link to={ROUTES.portal.messages}>
                <MessageSquare className="h-3.5 w-3.5" /> Message us
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={ROUTES.portal.quotations}>
                <ArrowRight className="h-3.5 w-3.5" /> View quotations
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Projects" value={formatNumber(activeProjects)} icon={FolderKanban} />
        <StatCard label="Pending Quotations" value={formatNumber(pendingQuotations.length)} icon={FileText} />
        <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={Receipt} />
        <StatCard label="Completed Projects" value={formatNumber(completedProjects)} icon={CheckCircle2} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientProfileQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
              </div>
            ) : clientProfileQuery.isError || !clientProfileQuery.data ? (
              <p className="text-sm text-ink-muted">Could not load profile.</p>
            ) : (
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-faint">Name</dt>
                  <dd className="text-right text-ink">{clientProfileQuery.data.contactName}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-faint">Email</dt>
                  <dd className="text-right text-ink">{clientProfileQuery.data.email}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-faint">Phone</dt>
                  <dd className="text-right text-ink">{clientProfileQuery.data.phone}</dd>
                </div>
                {clientProfileQuery.data.companyName ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-faint">Company</dt>
                    <dd className="text-right text-ink">{clientProfileQuery.data.companyName}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-faint">Client ID</dt>
                  <dd className="font-mono text-right text-xs text-ink">{clientProfileQuery.data.clientNumber}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-faint">Member since</dt>
                  <dd className="text-right text-ink">{formatDate(clientProfileQuery.data.createdAt)}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> Upcoming Payments
            </CardTitle>
            <CardDescription>Invoices with a balance and an upcoming due date.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingPayments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming payments"
                description="Outstanding invoices with due dates appear here."
              />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {upcomingPayments.map((invoice) => (
                  <li key={invoice.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <Link
                        to={ROUTES.portal.invoiceDetail(invoice.id)}
                        className="font-mono text-sm font-medium text-ink hover:text-primary"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="text-xs text-ink-faint">
                        Due {formatDate(invoice.dueDate!)} &middot; {invoice.label}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-ink">{formatCurrency(invoice.outstandingAmount ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" /> Quick Stats
                </CardTitle>
                <CardDescription>Key metrics at a glance.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-faint">Invoices</p>
                <p className="mt-0.5 text-lg font-semibold text-ink">{formatNumber(totalInvoiceCount)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-faint">Documents</p>
                <p className="mt-0.5 text-lg font-semibold text-ink">{formatNumber(totalDocumentsCount)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-faint">Total invoiced</p>
                <p className="mt-0.5 text-lg font-semibold text-ink">{formatCurrency(totalInvoiced)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-faint">Total paid</p>
                <p className="mt-0.5 text-lg font-semibold text-ink">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4" /> Notifications
                </CardTitle>
                <CardDescription>Your latest updates and alerts.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {notificationsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentNotifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="All caught up"
                description="Notifications for updates and alerts will appear here."
              />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {recentNotifications.map((notification) => (
                  <li key={notification.id} className="px-4 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{notification.title}</p>
                        <p className="text-xs text-ink-faint">{notification.description}</p>
                      </div>
                      {!notification.isRead && <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-faint">{formatRelativeTime(notification.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> Recent Activity
          </CardTitle>
          <CardDescription>The latest events on your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : timelineEvents.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No recent activity"
              description="Events related to your account will show up here."
            />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {timelineEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div>
                    <p className="text-sm text-ink">{event.description}</p>
                    {event.actorRef ? (
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {event.actorRef} &middot; {formatRelativeTime(event.createdAt)}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-ink-faint">{formatRelativeTime(event.createdAt)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quotations awaiting your decision</CardTitle>
            <CardDescription>Review, accept, reject, or request changes - the workflow updates instantly.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingQuotations.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nothing waiting on you"
                description="Quotations sent for your review will appear here."
              />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {pendingQuotations.slice(0, 4).map((quotation) => {
                  const activeVersion =
                    quotation.versions?.find((version) => version.isActive) ?? quotation.versions?.[0];
                  return (
                    <li key={quotation.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="font-mono text-sm font-medium text-ink">{quotation.quotationNumber}</p>
                        <p className="text-xs text-ink-faint">
                          {activeVersion ? formatCurrency(activeVersion.grandTotal) : '-'} ·{' '}
                          {formatDate(quotation.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={quotation.status} />
                        <Button variant="secondary" size="sm" asChild>
                          <Link to={ROUTES.portal.quotationDetail(quotation.id)}>Review</Link>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding invoices</CardTitle>
            <CardDescription>Invoices with a balance remaining, across all your projects.</CardDescription>
          </CardHeader>
          <CardContent>
            {outstandingInvoices.length === 0 ? (
              <EmptyState icon={Receipt} title="All settled" description="Invoices with a balance due will appear here." />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {outstandingInvoices.slice(0, 4).map((invoice) => (
                  <li key={invoice.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-mono text-sm font-medium text-ink">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-ink-faint">
                        {invoice.label} · Issued {formatDate(invoice.issuedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">
                        {formatCurrency(invoice.outstandingAmount ?? 0)}
                      </span>
                      <Button variant="secondary" size="sm" asChild>
                        <Link to={ROUTES.portal.invoiceDetail(invoice.id)}>View</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent documents</CardTitle>
                <CardDescription>The latest files shared with you.</CardDescription>
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link to={ROUTES.portal.documents}>
                  <FolderOpen className="h-3.5 w-3.5" /> All documents
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No documents yet"
                description="Files shared by the business will appear here."
              />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {recentDocuments.map((document) => (
                  <li key={document.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{document.fileName}</p>
                      <p className="text-xs capitalize text-ink-faint">
                        {document.documentType.replace(/_/g, ' ').toLowerCase()} · {formatDate(document.createdAt)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(document)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent messages</CardTitle>
                <CardDescription>The latest updates in your conversation.</CardDescription>
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link to={ROUTES.portal.messages}>
                  <MessageSquare className="h-3.5 w-3.5" /> Open messages
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentMessages.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No messages yet"
                description="Use the portal chat for questions, approvals, and follow-ups tied to your account."
                actionLabel="Start a conversation"
                onAction={() => navigate(ROUTES.portal.messages)}
              />
            ) : (
              <ul className="space-y-2">
                {recentMessages.map((message) => (
                  <li key={message.id} className="rounded-lg border border-border bg-canvas px-4 py-2.5">
                    <p className="line-clamp-2 text-sm text-ink">{message.body}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {message.senderType === 'CLIENT' ? 'You' : 'Nexus team'} · {formatRelativeTime(message.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your projects</CardTitle>
              <CardDescription>Each project is tracked independently, with its own status and billing history.</CardDescription>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link to={ROUTES.portal.projects}>
                <FolderKanban className="h-3.5 w-3.5" /> All projects
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Once a quotation is accepted and a project is created, it will appear here with its live status."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {recentProjects.map((project) => {
                const balance = project.totalInvoiced - project.totalPaid;

                return (
                  <div key={project.id} className="rounded-lg border border-border bg-canvas p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-semibold text-ink">{project.projectNumber}</p>
                        <p className="mt-1 text-sm text-ink-muted">Billing and service progress for this project.</p>
                      </div>
                      <StatusBadge status={project.aggregateStatus} />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-ink-faint">Invoiced</p>
                        <p className="mt-1 text-sm font-medium text-ink">{formatCurrency(project.totalInvoiced)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-ink-faint">Paid</p>
                        <p className="mt-1 text-sm font-medium text-ink">{formatCurrency(project.totalPaid)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-ink-faint">Outstanding</p>
                        <p className="mt-1 text-sm font-medium text-ink">{formatCurrency(balance)}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                      <p className="text-xs text-ink-faint">Open the project detail to view progress and service updates.</p>
                      <Button variant="secondary" size="sm" asChild>
                        <Link to={ROUTES.portal.projectDetail(project.id)}>Open project</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink-muted">
        <Clock3 className="h-4 w-4 shrink-0" />
        {formatNumber(totalProjects)} project{totalProjects === 1 ? '' : 's'} on record - detailed timelines are on each
        project and quotation page.
      </div>
    </div>
  );
}
