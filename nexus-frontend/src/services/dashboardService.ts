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
