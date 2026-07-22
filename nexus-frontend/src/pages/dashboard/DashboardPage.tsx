import { Link } from 'react-router-dom';
import {
  FolderKanban,
  FileText,
  Users,
  FileSpreadsheet,
  Receipt,
  IndianRupee,
  AlertCircle,
  Clock,
  TrendingUp,
  Search,
  Plus,
  ArrowRight,
  Bell,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Banknote,
  CalendarClock,
  Eye,
  CreditCard,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { SkeletonStatCard, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ComparisonBarChart, DistributionDonutChart, GroupedBarChart } from '@/components/ui/Charts';
import { useApiQuery } from '@/hooks/useApiQuery';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { LucideIcon } from 'lucide-react';

function diffLabel(thisMonth: number, prevMonth: number): { value: string; direction: 'up' | 'down'; positive: boolean } | undefined {
  if (prevMonth === 0 && thisMonth === 0) return undefined;
  if (prevMonth === 0) return { value: `${thisMonth} new`, direction: 'up', positive: true };
  const pct = Math.round(((thisMonth - prevMonth) / prevMonth) * 100);
  if (pct === 0) return undefined;
  return { value: `${Math.abs(pct)}%`, direction: pct > 0 ? 'up' : 'down', positive: pct > 0 };
}

const EVENT_ICONS: Record<string, LucideIcon> = {
  LEAD_CREATED: FileText,
  LEAD_CONVERTED: Users,
  LEAD_ARCHIVED: XCircle,
  LEAD_RESTORED: CheckCircle2,
  QUOTATION_CREATED: FileSpreadsheet,
  QUOTATION_SENT: ArrowRight,
  QUOTATION_APPROVED: CheckCircle2,
  QUOTATION_ACCEPTED: CheckCircle2,
  PROJECT_CREATED: FolderKanban,
  PROJECT_STATUS_CHANGED: TrendingUp,
  INVOICE_GENERATED: Receipt,
  INVOICE_ISSUED: Receipt,
  PAYMENT_RECORDED: Banknote,
  DOCUMENT_UPLOADED: FileText,
};

function formatMonth(m: string) {
  const [year, month] = m.split('-');
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString('en-IN', { month: 'short' });
}

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

  const kpis = data?.kpis;
  const charts = data?.charts;
  const upcoming = data?.upcoming;
  const comparisons = data?.comparisons;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your business performance."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Active Projects"
              value={formatNumber(kpis!.totalActiveProjects)}
              icon={FolderKanban}
              description="Total active"
            />
            <StatCard
              label="Total Leads"
              value={formatNumber(kpis!.totalLeads)}
              icon={FileText}
              trend={comparisons ? diffLabel(comparisons.leads.thisMonth, comparisons.leads.prevMonth) : undefined}
            />
            <StatCard
              label="Clients"
              value={formatNumber(kpis!.totalClients)}
              icon={Users}
              trend={comparisons ? diffLabel(comparisons.clients.thisMonth, comparisons.clients.prevMonth) : undefined}
            />
            <StatCard
              label="Quotations"
              value={formatNumber(kpis!.totalQuotations)}
              icon={FileSpreadsheet}
              trend={comparisons ? diffLabel(comparisons.quotations.thisMonth, comparisons.quotations.prevMonth) : undefined}
            />
            <StatCard
              label="Invoices"
              value={formatNumber(kpis!.totalInvoices)}
              icon={Receipt}
              trend={comparisons ? diffLabel(comparisons.invoices.thisMonth, comparisons.invoices.prevMonth) : undefined}
            />
            <StatCard
              label="Revenue Invoiced"
              value={formatCurrency(kpis!.totalRevenueInvoiced)}
              icon={IndianRupee}
            />
            <StatCard
              label="Revenue Received"
              value={formatCurrency(kpis!.totalRevenueReceived)}
              icon={Banknote}
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(kpis!.outstandingAmount)}
              icon={AlertCircle}
              trend={
                kpis!.outstandingAmount > 0
                  ? { value: 'Pending', direction: 'down', positive: false }
                  : undefined
              }
            />
            <StatCard
              label="Pending Quotations"
              value={formatNumber(kpis!.pendingQuotations)}
              icon={Clock}
            />
            <StatCard
              label="Projects In Progress"
              value={formatNumber(kpis!.projectsInProgress)}
              icon={TrendingUp}
            />
            <StatCard
              label="Total Payments"
              value={formatNumber(kpis!.totalPaymentCount)}
              icon={CreditCard}
            />
            <StatCard
              label="Avg Payment Size"
              value={formatCurrency(kpis!.avgPaymentSize)}
              icon={Banknote}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Services by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : !charts?.leadServicesByStatus.length ? (
              <p className="py-16 text-center text-sm text-ink-muted">No lead services yet.</p>
            ) : (
              <ComparisonBarChart
                data={charts.leadServicesByStatus}
                dataKey="count"
                xKey="status"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : !charts?.leadsBySource.length ? (
              <p className="py-16 text-center text-sm text-ink-muted">No leads yet.</p>
            ) : (
              <DistributionDonutChart
                data={charts.leadsBySource.map((s) => ({ name: s.source, value: s.count }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : !charts?.monthlyRevenue.length ? (
              <p className="py-16 text-center text-sm text-ink-muted">No revenue data yet.</p>
            ) : (
              <GroupedBarChart
                data={charts.monthlyRevenue.map((m) => ({ ...m, month: formatMonth(m.month) }))}
                keys={['invoiced', 'received']}
                xKey="month"
                colors={['#4553FF', '#15803D']}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : !charts?.projectsByStatus.length ? (
              <p className="py-16 text-center text-sm text-ink-muted">No projects yet.</p>
            ) : (
              <DistributionDonutChart
                data={charts.projectsByStatus.map((s) => ({ name: s.status, value: s.count }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : !charts?.paymentMethods?.length ? (
              <p className="py-16 text-center text-sm text-ink-muted">No payments yet.</p>
            ) : (
              <DistributionDonutChart
                data={charts.paymentMethods.map((m) => ({ name: m.method, value: m.count }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity + Upcoming Items */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !data?.recentActivity.length ? (
              <p className="py-16 text-center text-sm text-ink-muted">No activity yet.</p>
            ) : (
              <div className="space-y-1">
                {data.recentActivity.map((event) => {
                  const Icon = EVENT_ICONS[event.eventType] || Clock;
                  return (
                    <Link
                      key={event.id}
                      to={`/${event.entityType.toLowerCase()}s/${event.entityId}`}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-canvas"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle">
                        <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{event.description}</p>
                        <p className="text-xs text-ink-faint">{formatRelativeTime(event.createdAt)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                <UpcomingRow
                  icon={Clock}
                  label="Pending Quotations"
                  value={upcoming!.pendingQuotations}
                  to={ROUTES.quotations}
                  color="text-amber-600"
                />
                <UpcomingRow
                  icon={PauseCircle}
                  label="Projects On Hold"
                  value={upcoming!.projectsOnHold}
                  to={ROUTES.projects}
                  color="text-orange-600"
                />
                <UpcomingRow
                  icon={AlertCircle}
                  label="Overdue Invoices"
                  value={upcoming!.overdueInvoices}
                  to={ROUTES.invoices}
                  color="text-red-600"
                />
                <UpcomingRow
                  icon={CalendarClock}
                  label="Awaiting Payment"
                  value={upcoming!.invoicesAwaitingPayment}
                  to={ROUTES.invoices}
                  color="text-blue-600"
                />
                <UpcomingRow
                  icon={Bell}
                  label="Unread Notifications"
                  value={upcoming!.unreadNotifications}
                  to={ROUTES.notifications}
                  color="text-purple-600"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Search + Notifications */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" asChild>
                <Link to={ROUTES.leads}><Plus className="h-3.5 w-3.5" /> New Lead</Link>
              </Button>
              <Button variant="primary" size="sm" asChild>
                <Link to={ROUTES.quotations}><Plus className="h-3.5 w-3.5" /> New Quotation</Link>
              </Button>
              <Button variant="primary" size="sm" asChild>
                <Link to={ROUTES.invoices}><Plus className="h-3.5 w-3.5" /> New Invoice</Link>
              </Button>
              <Button variant="primary" size="sm" asChild>
                <Link to={ROUTES.projects}><Plus className="h-3.5 w-3.5" /> New Project</Link>
              </Button>
              <div className="my-1 w-full border-t border-border" />
              <Button variant="secondary" size="sm" asChild>
                <Link to={ROUTES.leads}><Eye className="h-3.5 w-3.5" /> View Leads</Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link to={ROUTES.clients}><Eye className="h-3.5 w-3.5" /> View Clients</Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link to={ROUTES.projects}><Eye className="h-3.5 w-3.5" /> View Projects</Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link to={ROUTES.invoices}><Eye className="h-3.5 w-3.5" /> View Invoices</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas">
                <Search className="h-4 w-4 text-ink-faint" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Search anything</p>
                <p className="text-xs text-ink-faint">
                  Press <kbd className="mx-0.5 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-medium">Ctrl+K</kbd> to search
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Notifications</p>
                <Link to={ROUTES.notifications} className="text-xs font-medium text-accent hover:underline">
                  View all
                </Link>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-full" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-subtle">
                    <Bell className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {upcoming!.unreadNotifications === 0
                        ? 'All caught up!'
                        : `${upcoming!.unreadNotifications} unread notification${upcoming!.unreadNotifications === 1 ? '' : 's'}`}
                    </p>
                    <p className="text-xs text-ink-faint">
                      {upcoming!.unreadNotifications === 0
                        ? 'No new notifications'
                        : 'Click to view notifications'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function UpcomingRow({
  icon: Icon,
  label,
  value,
  to,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  to: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-canvas"
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.75} />
        <span className="text-ink-muted">{label}</span>
      </div>
      <span className="font-mono text-sm font-semibold text-ink">{formatNumber(value)}</span>
    </Link>
  );
}
