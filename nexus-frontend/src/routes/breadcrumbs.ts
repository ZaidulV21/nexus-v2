import { ROUTES } from './routes';

// Maps a top-level path segment to its breadcrumb label. Falls back to a
// capitalized version of the segment for any route not listed here, so new
// routes never render a blank crumb.
const SEGMENT_LABELS: Record<string, string> = {
  '': 'Dashboard',
  leads: 'Leads',
  clients: 'Clients',
  quotations: 'Quotations',
  projects: 'Projects',
  invoices: 'Invoices',
  messages: 'Messages',
  documents: 'Documents',
  timeline: 'Timeline',
  'audit-logs': 'Audit Logs',
  search: 'Search',
  settings: 'Settings',
  'design-system': 'Design System',
  portal: 'Client Portal',
};

function labelFor(segment: string): string {
  if (segment in SEGMENT_LABELS) return SEGMENT_LABELS[segment];
  // Looks like an id (uuid-ish or numeric) - show a generic "Detail" crumb
  // rather than a raw id string.
  if (/^[0-9a-f-]{8,}$/i.test(segment)) return 'Detail';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function getBreadcrumbs(pathname: string) {
  if (pathname === ROUTES.dashboard) {
    return [{ label: 'Dashboard' }];
  }
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const isLast = i === segments.length - 1;
    return { label: labelFor(segment), href: isLast ? undefined : href };
  });
}
