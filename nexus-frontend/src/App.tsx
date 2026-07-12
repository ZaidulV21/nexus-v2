import { Routes, Route } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { AdminLayout } from '@/app/AdminLayout';
import { PortalLayout } from '@/app/PortalLayout';

import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { LeadsPage } from '@/pages/leads/LeadsPage';
import { LeadDetailPage } from '@/pages/leads/LeadDetailPage';
import { ClientsPage } from '@/pages/clients/ClientsPage';
import { ClientDetailPage } from '@/pages/clients/ClientDetailPage';
import { QuotationsPage } from '@/pages/quotations/QuotationsPage';
import { QuotationDetailPage } from '@/pages/quotations/QuotationDetailPage';
import { ProjectsPage } from '@/pages/projects/ProjectsPage';
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage';
import { InvoicesPage } from '@/pages/invoices/InvoicesPage';
import { InvoiceDetailPage } from '@/pages/invoices/InvoiceDetailPage';
import { MessagesPage } from '@/pages/messages/MessagesPage';
import { DocumentsPage } from '@/pages/documents/DocumentsPage';
import { TimelinePage } from '@/pages/timeline/TimelinePage';
import { AuditLogsPage } from '@/pages/audit-logs/AuditLogsPage';
import { SearchPage } from '@/pages/search/SearchPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { DesignSystemPage } from '@/pages/design-system/DesignSystemPage';

import { PortalDashboardPage } from '@/pages/portal/PortalDashboardPage';
import { PortalQuotationsPage } from '@/pages/portal/PortalQuotationsPage';
import { PortalQuotationDetailPage } from '@/pages/portal/PortalQuotationDetailPage';
import { PortalProjectsPage } from '@/pages/portal/PortalProjectsPage';
import { PortalInvoicesPage } from '@/pages/portal/PortalInvoicesPage';
import { PortalMessagesPage } from '@/pages/portal/PortalMessagesPage';
import { PortalDocumentsPage } from '@/pages/portal/PortalDocumentsPage';

import { LoginPage } from '@/pages/auth/LoginPage';
import { NotFoundPage } from '@/pages/errors/NotFoundPage';
import { ProtectedRoute } from '@/app/ProtectedRoute';

export default function App() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/quotations" element={<QuotationsPage />} />
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
        </Route>

        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<PortalDashboardPage />} />
          <Route path="quotations" element={<PortalQuotationsPage />} />
          <Route path="quotations/:id" element={<PortalQuotationDetailPage />} />
          <Route path="projects" element={<PortalProjectsPage />} />
          <Route path="projects/:id" element={<PortalProjectsPage />} />
          <Route path="invoices" element={<PortalInvoicesPage />} />
          <Route path="messages" element={<PortalMessagesPage />} />
          <Route path="documents" element={<PortalDocumentsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppProviders>
  );
}
