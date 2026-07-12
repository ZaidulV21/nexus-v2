import { Outlet, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { getBreadcrumbs } from '@/routes/breadcrumbs';

/** Shell for every Admin route: sidebar + top nav + auto-derived breadcrumbs. */
export function AdminLayout() {
  const location = useLocation();
  return (
    <AppShell breadcrumbs={getBreadcrumbs(location.pathname)}>
      <Outlet />
    </AppShell>
  );
}
