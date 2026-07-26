import { ClipboardList, FolderOpen, FolderCheck, FileText, Receipt, IndianRupee } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency } from '@/lib/format';
import type { ClientSummaryData } from '@/services/clientService';

export function ClientOverviewKPI({ kpis }: { kpis: ClientSummaryData['kpis'] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Service Requests" value={String(kpis.totalServiceRequests)} icon={ClipboardList} />
      <StatCard label="Active Projects" value={String(kpis.activeProjects)} icon={FolderOpen} />
      <StatCard label="Completed Projects" value={String(kpis.completedProjects)} icon={FolderCheck} />
      <StatCard label="Pending Quotations" value={String(kpis.pendingQuotations)} icon={FileText} />
      <StatCard label="Total Invoices" value={String(kpis.totalInvoices)} icon={Receipt} />
      <StatCard label="Lifetime Revenue" value={formatCurrency(kpis.lifetimeRevenue)} icon={IndianRupee} />
    </div>
  );
}
