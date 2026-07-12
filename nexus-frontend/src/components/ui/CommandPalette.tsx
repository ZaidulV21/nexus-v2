import { useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, FolderKanban, Receipt, FileSpreadsheet, LayoutDashboard } from 'lucide-react';
import { useDisclosure } from '@/hooks/useDisclosure';
import { ROUTES } from '@/routes/routes';

const NAV_COMMANDS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: ROUTES.dashboard },
  { label: 'Leads', icon: FileText, path: ROUTES.leads },
  { label: 'Clients', icon: Users, path: ROUTES.clients },
  { label: 'Projects', icon: FolderKanban, path: ROUTES.projects },
  { label: 'Quotations', icon: FileSpreadsheet, path: ROUTES.quotations },
  { label: 'Invoices', icon: Receipt, path: ROUTES.invoices },
];

/** Global Cmd+K / Ctrl+K command palette for cross-module navigation and quick search. */
export function CommandPalette() {
  const { isOpen, setIsOpen } = useDisclosure(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setIsOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" role="dialog" aria-modal>
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-[2px] animate-fade-in" onClick={() => setIsOpen(false)} />
      <Command
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface-raised shadow-lg animate-scale-in"
        loop
      >
        <Command.Input
          autoFocus
          placeholder="Search leads, clients, projects, invoices..."
          className="w-full border-b border-border bg-transparent px-4 py-3.5 text-sm text-ink placeholder:text-ink-faint outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
          <Command.Empty className="px-3 py-6 text-center text-sm text-ink-muted">No results found.</Command.Empty>
          <Command.Group heading="Navigate" className="px-2 py-1.5 text-xs font-medium text-ink-faint">
            {NAV_COMMANDS.map((cmd) => (
              <Command.Item
                key={cmd.path}
                onSelect={() => {
                  navigate(cmd.path);
                  setIsOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink aria-selected:bg-accent-subtle aria-selected:text-accent"
              >
                <cmd.icon className="h-4 w-4" />
                {cmd.label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-ink-faint">
          <span>Navigate with &uarr; &darr;</span>
          <span>Select with &crarr;</span>
        </div>
      </Command>
    </div>
  );
}
