import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { AdminLayout } from '@/app/AdminLayout';
import { PortalLayout } from '@/app/PortalLayout';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { PortalProtectedRoute } from '@/app/PortalProtectedRoute';

// Public Marketing Website
import { PublicLayout } from '@/public-site/layouts/PublicLayout';

// Phase 16 (performance): route-level code splitting. Each page is loaded in
// its own chunk on first navigation instead of being bundled into the initial
// ~2.2MB main chunk. Named exports are mapped to a default export for lazy().
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LeadsPage = lazy(() => import('@/pages/leads/LeadsPage').then((m) => ({ default: m.LeadsPage })));
const LeadDetailPage = lazy(() => import('@/pages/leads/LeadDetailPage').then((m) => ({ default: m.LeadDetailPage })));
const ClientsPage = lazy(() => import('@/pages/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })));
const ClientDetailPage = lazy(() => import('@/pages/clients/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })));
const QuotationsPage = lazy(() => import('@/pages/quotations/QuotationsPage').then((m) => ({ default: m.QuotationsPage })));
const QuotationDetailPage = lazy(() => import('@/pages/quotations/QuotationDetailPage').then((m) => ({ default: m.QuotationDetailPage })));
const ServicesPage = lazy(() => import('@/pages/services/ServicesPage').then((m) => ({ default: m.ServicesPage })));
const ServiceDetailPage = lazy(() => import('@/pages/services/ServiceDetailPage').then((m) => ({ default: m.ServiceDetailPage })));
const CategoriesPage = lazy(() => import('@/pages/categories/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const ProjectsPage = lazy(() => import('@/pages/projects/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import('@/pages/projects/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })));
const InvoicesPage = lazy(() => import('@/pages/invoices/InvoicesPage').then((m) => ({ default: m.InvoicesPage })));
const PaymentsPage = lazy(() => import('@/pages/payments/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const InvoiceDetailPage = lazy(() => import('@/pages/invoices/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })));
const MessagesPage = lazy(() => import('@/pages/messages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const SupportInboxPage = lazy(() => import('@/pages/support/SupportInboxPage').then((m) => ({ default: m.SupportInboxPage })));
const DocumentsPage = lazy(() => import('@/pages/documents/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const TimelinePage = lazy(() => import('@/pages/timeline/TimelinePage').then((m) => ({ default: m.TimelinePage })));
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const AuditLogsPage = lazy(() => import('@/pages/audit-logs/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const SearchPage = lazy(() => import('@/pages/search/SearchPage').then((m) => ({ default: m.SearchPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const CompanySettingsPage = lazy(() => import('@/pages/settings/CompanySettingsPage').then((m) => ({ default: m.CompanySettingsPage })));
const DesignSystemPage = lazy(() => import('@/pages/design-system/DesignSystemPage').then((m) => ({ default: m.DesignSystemPage })));

const PortalDashboardPage = lazy(() => import('@/pages/portal/PortalDashboardPage').then((m) => ({ default: m.PortalDashboardPage })));
const PortalQuotationsPage = lazy(() => import('@/pages/portal/PortalQuotationsPage').then((m) => ({ default: m.PortalQuotationsPage })));
const PortalQuotationDetailPage = lazy(() => import('@/pages/portal/PortalQuotationDetailPage').then((m) => ({ default: m.PortalQuotationDetailPage })));
const PortalProjectsPage = lazy(() => import('@/pages/portal/PortalProjectsPage').then((m) => ({ default: m.PortalProjectsPage })));
const PortalProjectDetailPage = lazy(() => import('@/pages/portal/PortalProjectDetailPage').then((m) => ({ default: m.PortalProjectDetailPage })));
const PortalInvoicesPage = lazy(() => import('@/pages/portal/PortalInvoicesPage').then((m) => ({ default: m.PortalInvoicesPage })));
const PortalInvoiceDetailPage = lazy(() => import('@/pages/portal/PortalInvoiceDetailPage').then((m) => ({ default: m.PortalInvoiceDetailPage })));
const PortalMessagesPage = lazy(() => import('@/pages/portal/PortalMessagesPage').then((m) => ({ default: m.PortalMessagesPage })));
const PortalDocumentsPage = lazy(() => import('@/pages/portal/PortalDocumentsPage').then((m) => ({ default: m.PortalDocumentsPage })));
const PortalNotificationsPage = lazy(() => import('@/pages/portal/PortalNotificationsPage').then((m) => ({ default: m.PortalNotificationsPage })));
const PortalServiceRequestPage = lazy(() => import('@/pages/portal/PortalServiceRequestPage').then((m) => ({ default: m.PortalServiceRequestPage })));

const PublicHomePage = lazy(() => import('@/public-site/pages/HomePage').then((m) => ({ default: m.HomePage })));
const PublicServicesPage = lazy(() => import('@/public-site/pages/ServicesPage').then((m) => ({ default: m.ServicesPage })));
const PublicServiceDetailPage = lazy(() => import('@/public-site/pages/ServiceDetailPage').then((m) => ({ default: m.ServiceDetailPage })));
const PublicIndustriesPage = lazy(() => import('@/public-site/pages/IndustriesPage').then((m) => ({ default: m.IndustriesPage })));
const PublicHowItWorksPage = lazy(() => import('@/public-site/pages/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage })));
const PublicProjectsPage = lazy(() => import('@/public-site/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const PublicAboutPage = lazy(() => import('@/public-site/pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const PublicContactPage = lazy(() => import('@/public-site/pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const PublicGetQuotePage = lazy(() => import('@/public-site/pages/GetQuotePage').then((m) => ({ default: m.GetQuotePage })));

// Auth + error pages stay eager: they render on the entrypoint routes.
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { NotFoundPage } from '@/pages/errors/NotFoundPage';

export default function App() {
  return (
    <AppProviders>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* ═══════════════════════════════════════════════════════════════
              1. PUBLIC WEBSITE — no auth, always PublicLayout
              ═══════════════════════════════════════════════════════════════ */}
          <Route element={<PublicLayout />}>
            <Route index element={<PublicHomePage />} />
            <Route path="services" element={<PublicServicesPage />} />
            <Route path="services/:slug/:subSlug" element={<PublicServiceDetailPage />} />
            <Route path="services/:slug" element={<PublicServiceDetailPage />} />
            <Route path="industries" element={<PublicIndustriesPage />} />
            <Route path="how-it-works" element={<PublicHowItWorksPage />} />
            <Route path="projects" element={<PublicProjectsPage />} />
            <Route path="about" element={<PublicAboutPage />} />
            {/* Resources page — disabled, can be restored later */}
            {/* <Route path="resources" element={<ResourcesPage />} /> */}
            <Route path="contact" element={<PublicContactPage />} />
            <Route path="get-quote" element={<PublicGetQuotePage />} />
          </Route>

          {/* ═══════════════════════════════════════════════════════════════
              2. LOGIN — shared, no layout wrapper
              ═══════════════════════════════════════════════════════════════ */}
          <Route path="login" element={<LoginPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />

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
            <Route path="services" element={<ServicesPage />} />
            <Route path="services/:id" element={<ServiceDetailPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="support" element={<SupportInboxPage />} />
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
            <Route path="service-request" element={<PortalServiceRequestPage />} />
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
      </Suspense>
    </AppProviders>
  );
}

/**
 * Rendered while a lazily-loaded route chunk is being fetched.
 */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
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
