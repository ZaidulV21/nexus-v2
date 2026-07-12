import { Link } from 'react-router-dom';
import { FolderKanban, IndianRupee, Receipt, AlertCircle, FileText, Users, FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { SkeletonStatCard, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ComparisonBarChart, DistributionDonutChart } from '@/components/ui/Charts';
import { useApiQuery } from '@/hooks/useApiQuery';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency, formatNumber } from '@/lib/format';
import { ROUTES } from '@/routes/routes';

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useApiQuery(() => dashboardService.getAdminSummary(), []);

  if (isError) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <Card>
          <ErrorState description="Couldn't load the dashboard summary." onRetry={refetch} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of leads, projects, and revenue across the business."
        actions={
          <>
            <Button variant="secondary" size="sm" asChild>
              <Link to={ROUTES.leads}><FileText className="h-3.5 w-3.5" /> New Lead</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={ROUTES.quotations}><FileSpreadsheet className="h-3.5 w-3.5" /> New Quotation</Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          <>
            <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard label="Active Projects" value={formatNumber(data!.activeProjectsCount)} icon={FolderKanban} />
            <StatCard label="Total Invoiced" value={formatCurrency(data!.revenue.totalInvoiced)} icon={IndianRupee} />
            <StatCard label="Total Paid" value={formatCurrency(data!.revenue.totalPaid)} icon={Receipt} />
            <StatCard
              label="Outstanding"
              value={formatCurrency(data!.revenue.outstanding)}
              icon={AlertCircle}
              trend={
                data!.invoicesAwaitingFirstPayment > 0
                  ? { value: `${data!.invoicesAwaitingFirstPayment} awaiting payment`, direction: 'down', positive: false }
                  : undefined
              }
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lead services by status</CardTitle>
            <CardDescription>Where every requested service currently sits in the pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : data!.leadServicesByStatus.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-muted">No leads yet.</p>
            ) : (
              <ComparisonBarChart data={data!.leadServicesByStatus} dataKey="_count" xKey="status" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads by source</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : data!.leadsBySource.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-muted">No leads yet.</p>
            ) : (
              <DistributionDonutChart data={data!.leadsBySource.map((s) => ({ name: s.source, value: s._count }))} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link to={ROUTES.leads}><FileText className="h-3.5 w-3.5" /> View Leads</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to={ROUTES.clients}><Users className="h-3.5 w-3.5" /> View Clients</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to={ROUTES.projects}><FolderKanban className="h-3.5 w-3.5" /> View Projects</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to={ROUTES.invoices}><Receipt className="h-3.5 w-3.5" /> View Invoices</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
