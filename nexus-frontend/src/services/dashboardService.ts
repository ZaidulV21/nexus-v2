import { api } from '@/lib/api';

export interface DashboardKpis {
  totalActiveProjects: number;
  totalLeads: number;
  totalClients: number;
  totalQuotations: number;
  totalInvoices: number;
  totalRevenueInvoiced: number;
  totalRevenueReceived: number;
  outstandingAmount: number;
  pendingQuotations: number;
  projectsInProgress: number;
  totalPaymentsReceived: number;
  totalPaymentCount: number;
  avgPaymentSize: number;
}

export interface MonthComparison {
  thisMonth: number;
  prevMonth: number;
}

export interface DashboardComparisons {
  leads: MonthComparison;
  clients: MonthComparison;
  quotations: MonthComparison;
  projects: MonthComparison;
  invoices: MonthComparison;
}

export interface DashboardCharts {
  leadServicesByStatus: { status: string; count: number }[];
  leadsBySource: { source: string; count: number }[];
  monthlyRevenue: { month: string; invoiced: number; received: number }[];
  projectsByStatus: { status: string; count: number }[];
  paymentMethods: { method: string; count: number; total: number }[];
}

export interface DashboardActivity {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  description: string;
  createdAt: string;
}

export interface DashboardUpcoming {
  pendingQuotations: number;
  projectsOnHold: number;
  overdueInvoices: number;
  invoicesAwaitingPayment: number;
  unreadNotifications: number;
}

export interface AdminDashboardSummary {
  kpis: DashboardKpis;
  comparisons: DashboardComparisons;
  charts: DashboardCharts;
  recentActivity: DashboardActivity[];
  upcoming: DashboardUpcoming;
}

export interface ClientDashboardProjectSummary {
  id: string;
  projectNumber: string;
  aggregateStatus: string;
  totalInvoiced: number;
  totalPaid: number;
}

export interface ClientDashboardSummary {
  projects: ClientDashboardProjectSummary[];
}

export const dashboardService = {
  getAdminSummary: () => api.get<AdminDashboardSummary>('/dashboard/admin/summary'),
  getClientSummary: () => api.get<ClientDashboardSummary>('/dashboard/client/summary'),
};
