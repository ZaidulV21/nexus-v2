import { Routes, Route, Navigate } from 'react-router-dom';
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
import { ServicesPage as AdminServicesPage } from '@/pages/services/ServicesPage';
import { ServiceDetailPage as AdminServiceDetailPage } from '@/pages/services/ServiceDetailPage';
import { ProjectsPage as AdminProjectsPage } from '@/pages/projects/ProjectsPage';
import { ProjectDetailPage as AdminProjectDetailPage } from '@/pages/projects/ProjectDetailPage';
import { InvoicesPage } from '@/pages/invoices/InvoicesPage';
import { InvoiceDetailPage } from '@/pages/invoices/InvoiceDetailPage';
import { MessagesPage } from '@/pages/messages/MessagesPage';
import { DocumentsPage } from '@/pages/documents/DocumentsPage';
import { TimelinePage } from '@/pages/timeline/TimelinePage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { AuditLogsPage } from '@/pages/audit-logs/AuditLogsPage';
import { SearchPage } from '@/pages/search/SearchPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { CompanySettingsPage } from '@/pages/settings/CompanySettingsPage';
import { DesignSystemPage } from '@/pages/design-system/DesignSystemPage';

import { PortalDashboardPage } from '@/pages/portal/PortalDashboardPage';
import { PortalQuotationsPage } from '@/pages/portal/PortalQuotationsPage';
import { PortalQuotationDetailPage } from '@/pages/portal/PortalQuotationDetailPage';
import { PortalProjectsPage } from '@/pages/portal/PortalProjectsPage';
import { PortalProjectDetailPage } from '@/pages/portal/PortalProjectDetailPage';
import { PortalInvoicesPage } from '@/pages/portal/PortalInvoicesPage';
import { PortalInvoiceDetailPage } from '@/pages/portal/PortalInvoiceDetailPage';
import { PortalMessagesPage } from '@/pages/portal/PortalMessagesPage';
import { PortalDocumentsPage } from '@/pages/portal/PortalDocumentsPage';
import { PortalNotificationsPage } from '@/pages/portal/PortalNotificationsPage';

import { LoginPage } from '@/pages/auth/LoginPage';
import { NotFoundPage } from '@/pages/errors/NotFoundPage';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { PortalProtectedRoute } from '@/app/PortalProtectedRoute';

// Public Marketing Website
import { PublicLayout } from '@/public-site/layouts/PublicLayout';
import {
  HomePage,
  ServicesPage,
  ServiceDetailPage,
  IndustriesPage,
  HowItWorksPage,
  ProjectsPage,
  AboutPage,
  ContactPage,
  // ResourcesPage — disabled, can be restored later
  GetQuotePage,
} from '@/public-site/pages';

export default function App() {
  return (
    <AppProviders>
      <Routes>
        {/* ═══════════════════════════════════════════════════════════════
            1. PUBLIC WEBSITE — no auth, always PublicLayout
            ═══════════════════════════════════════════════════════════════ */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="services/:slug" element={<ServiceDetailPage />} />
          <Route path="industries" element={<IndustriesPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="about" element={<AboutPage />} />
          {/* Resources page — disabled, can be restored later */}
          {/* <Route path="resources" element={<ResourcesPage />} /> */}
          <Route path="contact" element={<ContactPage />} />
          <Route path="get-quote" element={<GetQuotePage />} />
        </Route>

        {/* ═══════════════════════════════════════════════════════════════
            2. LOGIN — shared, no layout wrapper
            ═══════════════════════════════════════════════════════════════ */}
        <Route path="login" element={<LoginPage />} />

        {/* ═══════════════════════════════════════════════════════════════
            3. ADMIN CRM — /admin/*, requires ADMIN auth
            ═══════════════════════════════════════════════════════════════ */}
        <Route
          path="admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="quotations" element={<QuotationsPage />} />
          <Route path="quotations/:id" element={<QuotationDetailPage />} />
          <Route path="services" element={<AdminServicesPage />} />
          <Route path="services/:id" element={<AdminServiceDetailPage />} />
          <Route path="projects" element={<AdminProjectsPage />} />
          <Route path="projects/:id" element={<AdminProjectDetailPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/company" element={<CompanySettingsPage />} />
          <Route path="design-system" element={<DesignSystemPage />} />
        </Route>

        {/* ═══════════════════════════════════════════════════════════════
            4. CLIENT PORTAL — /portal/*, requires CLIENT auth
            ═══════════════════════════════════════════════════════════════ */}
        <Route
          path="portal"
          element={
            <PortalProtectedRoute>
              <PortalLayout />
            </PortalProtectedRoute>
          }
        >
          <Route index element={<PortalDashboardPage />} />
          <Route path="quotations" element={<PortalQuotationsPage />} />
          <Route path="quotations/:id" element={<PortalQuotationDetailPage />} />
          <Route path="projects" element={<PortalProjectsPage />} />
          <Route path="projects/:id" element={<PortalProjectDetailPage />} />
          <Route path="invoices" element={<PortalInvoicesPage />} />
          <Route path="invoices/:id" element={<PortalInvoiceDetailPage />} />
          <Route path="messages" element={<PortalMessagesPage />} />
          <Route path="documents" element={<PortalDocumentsPage />} />
          <Route path="notifications" element={<PortalNotificationsPage />} />
        </Route>

        {/* ═══════════════════════════════════════════════════════════════
            5. LEGACY REDIRECTS — old admin URLs → /admin/*
            ═══════════════════════════════════════════════════════════════ */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
        <Route path="/leads" element={<Navigate to="/admin/leads" replace />} />
        <Route path="/leads/:id" element={<LegacyAdminRedirect />} />
        <Route path="/clients" element={<Navigate to="/admin/clients" replace />} />
        <Route path="/clients/:id" element={<LegacyAdminRedirect />} />
        <Route path="/quotations" element={<Navigate to="/admin/quotations" replace />} />
        <Route path="/quotations/:id" element={<LegacyAdminRedirect />} />
        <Route path="/invoices" element={<Navigate to="/admin/invoices" replace />} />
        <Route path="/invoices/:id" element={<LegacyAdminRedirect />} />
        <Route path="/messages" element={<Navigate to="/admin/messages" replace />} />
        <Route path="/documents" element={<Navigate to="/admin/documents" replace />} />
        <Route path="/notifications" element={<Navigate to="/admin/notifications" replace />} />
        <Route path="/timeline" element={<Navigate to="/admin/timeline" replace />} />
        <Route path="/audit-logs" element={<Navigate to="/admin/audit-logs" replace />} />
        <Route path="/search" element={<Navigate to="/admin/search" replace />} />
        <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
        <Route path="/settings/company" element={<Navigate to="/admin/settings/company" replace />} />
        <Route path="/design-system" element={<Navigate to="/admin/design-system" replace />} />

        {/* ═══════════════════════════════════════════════════════════════
            6. 404
            ═══════════════════════════════════════════════════════════════ */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppProviders>
  );
}

/**
 * Helper for legacy admin detail routes like /leads/:id → /admin/leads/:id.
 * Reads the id from the current URL and redirects.
 */
function LegacyAdminRedirect() {
  const path = window.location.pathname;
  // Extract the part after the first segment (e.g. /leads/abc → /admin/leads/abc)
  const match = path.match(/^\/([a-z-]+)\/(.+)$/);
  if (match) {
    return <Navigate to={`/admin/${match[1]}/${match[2]}`} replace />;
  }
  return <Navigate to="/admin" replace />;
}
