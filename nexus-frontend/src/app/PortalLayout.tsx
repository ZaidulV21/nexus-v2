import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Receipt, MessageSquare, FolderOpen, FileText, Bell, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/routes';
import { NexusLogo } from '@/components/layout/NexusLogo';
import { NotificationPanel } from '@/components/layout/NotificationPanel';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useUnreadCount } from '@/queries/useNotifications';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/app/AuthContext';

const PORTAL_NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: ROUTES.portal.dashboard },
  { label: 'Quotations', icon: FileText, to: ROUTES.portal.quotations },
  { label: 'My Projects', icon: FolderKanban, to: ROUTES.portal.projects },
  { label: 'Invoices', icon: Receipt, to: ROUTES.portal.invoices },
  { label: 'Messages', icon: MessageSquare, to: ROUTES.portal.messages },
  { label: 'Documents', icon: FolderOpen, to: ROUTES.portal.documents },
  { label: 'Notifications', icon: Bell, to: ROUTES.portal.notifications },
];

/** Client Portal is intentionally a separate, lighter shell from the Admin
 *  app - fewer nav items, no command palette/audit logs, matching the PRD's
 *  distinction between Admin and Client-facing surfaces. */
export function PortalLayout() {
  const { actor, logout } = useAuth();
  const navigate = useNavigate();
  const notifications = useDisclosure(false);
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;

  function handleLogout() {
    logout();
    navigate(ROUTES.login, { replace: true });
  }

  const userName = actor?.email.split('@')[0] ?? 'Client';

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur-md lg:px-6">
        <div className="flex items-center gap-2">
          <NexusLogo className="h-5 w-5" />
          <span className="text-sm font-semibold text-ink">Nexus</span>
          <span className="ml-1 rounded-sm bg-canvas px-1.5 py-0.5 text-xs text-ink-faint ring-1 ring-border">
            Client Portal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={notifications.toggle}
              className="relative rounded-md p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <NotificationPanel open={notifications.isOpen} onClose={notifications.close} />
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-ink">{userName}</p>
            <p className="text-xs text-ink-faint">Signed in</p>
          </div>
          <Avatar name={userName} size={28} />
          <Button variant="secondary" size="sm" onClick={handleLogout} className="ml-1">
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </header>

      <nav className="sticky top-14 z-20 flex gap-1 overflow-x-auto border-b border-border bg-surface px-4 py-2 lg:px-6">
        {PORTAL_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ROUTES.portal.dashboard}
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive ? 'bg-accent-subtle text-accent' : 'text-ink-muted hover:bg-canvas hover:text-ink'
              )
            }
          >
            <item.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
