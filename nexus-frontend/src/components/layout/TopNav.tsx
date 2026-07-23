import { Menu, Search, Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/Breadcrumbs';
import { Avatar } from '@/components/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/DropdownMenu';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useAuth } from '@/app/AuthContext';
import { ROUTES } from '@/routes/routes';
import { NotificationPanel } from './NotificationPanel';
import { useUnreadCount } from '@/queries/useNotifications';

export function TopNav({
  breadcrumbs,
  onOpenMobileSidebar,
}: {
  breadcrumbs: BreadcrumbItem[];
  onOpenMobileSidebar: () => void;
}) {
  const notifications = useDisclosure(false);
  const { actor, logout } = useAuth();
  const navigate = useNavigate();
  const { data: unreadData } = useUnreadCount();

  const unreadCount = unreadData?.count ?? 0;

  const userName = actor?.email.split('@')[0] ?? 'Admin';
  const userEmail = actor?.email ?? '';

  function handleLogout() {
    logout();
    navigate(ROUTES.login, { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink lg:hidden"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
        <Breadcrumbs items={breadcrumbs} className="hidden sm:flex" />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
          className="hidden items-center gap-2 rounded-md border border-border bg-canvas px-3 py-1.5 text-sm text-ink-faint transition-colors hover:border-border-strong sm:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="ml-4 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
            &#8984;K
          </kbd>
        </button>

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

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-canvas">
            <Avatar name={userName} size={28} />
            <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <p className="font-medium text-ink">{userName}</p>
              <p className="font-normal text-ink-faint">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="h-3.5 w-3.5" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.admin.settings)}>
              <Settings className="h-3.5 w-3.5" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-danger" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
