import { api } from '@/lib/api';

export interface AdminDashboardSummary {
  leadsBySource: { source: string; _count: number }[];
  leadServicesByStatus: { status: string; _count: number }[];
  activeProjectsCount: number;
  revenue: {
    totalInvoiced: number;
    totalPaid: number;
    outstanding: number;
  };
  invoicesAwaitingFirstPayment: number;
}

export const dashboardService = {
  getAdminSummary: () => api.get<AdminDashboardSummary>('/dashboard/admin/summary'),
};
