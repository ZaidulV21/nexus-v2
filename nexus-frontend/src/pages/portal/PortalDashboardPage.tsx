import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FolderKanban,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Receipt,
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
import { formatCurrency, formatNumber } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import { dashboardService } from '@/services/dashboardService';

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

export function PortalDashboardPage() {
  const { actor } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useApiQuery(() => dashboardService.getClientSummary(), []);

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
  const onHoldProjects = projects.filter((project) => project.aggregateStatus.startsWith('On Hold')).length;
  const totalInvoiced = projects.reduce((sum, project) => sum + project.totalInvoiced, 0);
  const totalPaid = projects.reduce((sum, project) => sum + project.totalPaid, 0);
  const outstanding = totalInvoiced - totalPaid;
  const recentProjects = projects.slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome${actor?.email ? `, ${actor.email}` : ''}`}
        description="Track project progress, review quotations and invoices, and access your documents in one place."
        actions={
          <>
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
        <StatCard label="Total Projects" value={formatNumber(totalProjects)} icon={FolderKanban} />
        <StatCard label="Active Projects" value={formatNumber(activeProjects)} icon={Clock3} />
        <StatCard label="Completed" value={formatNumber(completedProjects)} icon={CheckCircle2} />
        <StatCard label="On Hold" value={formatNumber(onHoldProjects)} icon={LayoutDashboard} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Financial snapshot</CardTitle>
            <CardDescription>Project-level billing across all of your active work.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-lg border border-border bg-canvas p-4">
              <p className="text-xs uppercase tracking-wide text-ink-faint">Total invoiced</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">{formatCurrency(totalInvoiced)}</p>
            </div>
            <div className="rounded-lg border border-border bg-canvas p-4">
              <p className="text-xs uppercase tracking-wide text-ink-faint">Total paid</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="rounded-lg border border-border bg-canvas p-4">
              <p className="text-xs uppercase tracking-wide text-ink-faint">Outstanding</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">{formatCurrency(outstanding)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick access</CardTitle>
            <CardDescription>Jump straight to the portal sections you use most often.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="secondary" className="w-full justify-between" asChild>
              <Link to={ROUTES.portal.projects}>
                <span className="inline-flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" /> My projects
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="secondary" className="w-full justify-between" asChild>
              <Link to={ROUTES.portal.invoices}>
                <span className="inline-flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Invoices
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="secondary" className="w-full justify-between" asChild>
              <Link to={ROUTES.portal.documents}>
                <span className="inline-flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" /> Documents
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Need help?</CardTitle>
            <CardDescription>Messages stay in one thread so you can follow each update chronologically.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={MessageSquare}
              title="Message the business"
              description="Use the portal chat for questions, approvals, and follow-ups tied to your account."
              actionLabel="Open messages"
              onAction={() => navigate(ROUTES.portal.messages)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Your projects</CardTitle>
            <CardDescription>Each project is tracked independently, with its own status and billing history.</CardDescription>
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
                      <p className="text-xs text-ink-faint">Open the project detail to view milestones and service updates.</p>
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
    </div>
  );
}
