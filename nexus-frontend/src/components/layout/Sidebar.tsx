import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  FileSpreadsheet,
  FolderKanban,
  Receipt,
  Layers,
  MessageSquare,
  FolderOpen,
  History,
  ShieldCheck,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/routes';
import { NexusLogo } from './NexusLogo';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', icon: LayoutDashboard, to: ROUTES.dashboard }],
  },
  {
    label: 'Pipeline',
    items: [
      { label: 'Services', icon: Layers, to: ROUTES.services },
      { label: 'Leads', icon: FileText, to: ROUTES.leads },
      { label: 'Clients', icon: Users, to: ROUTES.clients },
      { label: 'Quotations', icon: FileSpreadsheet, to: ROUTES.quotations },
      { label: 'Projects', icon: FolderKanban, to: ROUTES.projects },
      { label: 'Invoices', icon: Receipt, to: ROUTES.invoices },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Messages', icon: MessageSquare, to: ROUTES.messages },
      { label: 'Documents', icon: FolderOpen, to: ROUTES.documents },
      { label: 'Timeline', icon: History, to: ROUTES.timeline },
      { label: 'Audit Logs', icon: ShieldCheck, to: ROUTES.auditLogs },
      { label: 'Search', icon: Search, to: ROUTES.search },
    ],
  },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4">
        <NexusLogo className="h-6 w-6" />
        <span className="text-sm font-semibold text-ink">Nexus</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="mb-1.5 px-2.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === ROUTES.dashboard}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent-subtle text-accent'
                        : 'text-ink-muted hover:bg-canvas hover:text-ink'
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <NavLink
          to={ROUTES.settings}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
              isActive ? 'bg-accent-subtle text-accent' : 'text-ink-muted hover:bg-canvas hover:text-ink'
            )
          }
        >
          <Settings className="h-4 w-4" strokeWidth={1.75} />
          Settings
        </NavLink>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
      <div className="sticky top-0 h-screen">
        <SidebarContent />
      </div>
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="fixed left-0 top-0 h-full w-64 bg-surface shadow-lg animate-slide-in-from-left">
        <button onClick={onClose} className="absolute right-3 top-3.5 rounded p-1 text-ink-faint hover:bg-canvas hover:text-ink">
          <X className="h-4 w-4" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
