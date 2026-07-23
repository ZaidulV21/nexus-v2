import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, FolderKanban, Receipt, FileSpreadsheet, LayoutDashboard, Layers, Wrench, FolderOpen } from 'lucide-react';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useDebounce } from '@/hooks/useDebounce';
import { useGlobalSearch } from '@/queries/useSearch';
import { ROUTES } from '@/routes/routes';

const NAV_COMMANDS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: ROUTES.admin.dashboard },
  { label: 'Services', icon: Layers, path: ROUTES.admin.services },
  { label: 'Leads', icon: FileText, path: ROUTES.admin.leads },
  { label: 'Clients', icon: Users, path: ROUTES.admin.clients },
  { label: 'Projects', icon: FolderKanban, path: ROUTES.admin.projects },
  { label: 'Quotations', icon: FileSpreadsheet, path: ROUTES.admin.quotations },
  { label: 'Invoices', icon: Receipt, path: ROUTES.admin.invoices },
];

const MIN_QUERY_LENGTH = 2;

/** Global Cmd+K / Ctrl+K command palette for cross-module navigation and quick search. */
export function CommandPalette() {
  const { isOpen, setIsOpen } = useDisclosure(false);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { data: searchResults } = useGlobalSearch(debouncedQuery);

  const hasSearchResults =
    searchResults &&
    (searchResults.leads.length +
      searchResults.clients.length +
      searchResults.projects.length +
      searchResults.quotations.length +
      searchResults.invoices.length +
      searchResults.services.length +
      searchResults.documents.length) >
      0;

  const isSearchMode = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

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

  function handleSelect(path: string) {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" role="dialog" aria-modal>
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-[2px] animate-fade-in"
        onClick={() => {
          setIsOpen(false);
          setQuery('');
        }}
      />
      <Command
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface-raised shadow-lg animate-scale-in"
        loop
        value=""
        onValueChange={() => {}}
      >
        <Command.Input
          autoFocus
          placeholder="Search leads, clients, projects, invoices..."
          className="w-full border-b border-border bg-transparent px-4 py-3.5 text-sm text-ink placeholder:text-ink-faint outline-none"
          value={query}
          onValueChange={setQuery}
        />
        <Command.List className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
          <Command.Empty className="px-3 py-6 text-center text-sm text-ink-muted">
            {isSearchMode ? 'No results found.' : 'Type to search or navigate...'}
          </Command.Empty>

          {isSearchMode && hasSearchResults && (
            <>
              {searchResults.leads.length > 0 && (
                <Command.Group heading="Leads" className="px-2 py-1.5 text-xs font-medium text-ink-faint">
                  {searchResults.leads.slice(0, 5).map((lead) => (
                    <Command.Item
                      key={lead.id}
                      onSelect={() => handleSelect(ROUTES.admin.leadDetail(lead.id))}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink aria-selected:bg-accent-subtle aria-selected:text-accent"
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="truncate">{lead.leadNumber} — {lead.contactName}</span>
                      {lead.companyName && <span className="ml-auto shrink-0 text-xs text-ink-faint">{lead.companyName}</span>}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {searchResults.clients.length > 0 && (
                <Command.Group heading="Clients" className="px-2 py-1.5 text-xs font-medium text-ink-faint">
                  {searchResults.clients.slice(0, 5).map((client) => (
                    <Command.Item
                      key={client.id}
                      onSelect={() => handleSelect(ROUTES.admin.clientDetail(client.id))}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink aria-selected:bg-accent-subtle aria-selected:text-accent"
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="truncate">{client.clientNumber} — {client.contactName}</span>
                      {client.companyName && <span className="ml-auto shrink-0 text-xs text-ink-faint">{client.companyName}</span>}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {searchResults.projects.length > 0 && (
                <Command.Group heading="Projects" className="px-2 py-1.5 text-xs font-medium text-ink-faint">
                  {searchResults.projects.slice(0, 5).map((project) => (
                    <Command.Item
                      key={project.id}
                      onSelect={() => handleSelect(ROUTES.admin.projectDetail(project.id))}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink aria-selected:bg-accent-subtle aria-selected:text-accent"
                    >
                      <FolderKanban className="h-4 w-4 shrink-0" />
                      <span className="truncate">{project.projectNumber}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {searchResults.quotations.length > 0 && (
                <Command.Group heading="Quotations" className="px-2 py-1.5 text-xs font-medium text-ink-faint">
                  {searchResults.quotations.slice(0, 5).map((quotation) => (
                    <Command.Item
                      key={quotation.id}
                      onSelect={() => handleSelect(ROUTES.admin.quotationDetail(quotation.id))}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink aria-selected:bg-accent-subtle aria-selected:text-accent"
                    >
                      <FileSpreadsheet className="h-4 w-4 shrink-0" />
                      <span className="truncate">{quotation.quotationNumber}</span>
                      <span className="ml-auto shrink-0 rounded-full bg-canvas px-1.5 py-0.5 text-[10px] text-ink-muted ring-1 ring-border">{quotation.status}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {searchResults.invoices.length > 0 && (
                <Command.Group heading="Invoices" className="px-2 py-1.5 text-xs font-medium text-ink-faint">
                  {searchResults.invoices.slice(0, 5).map((invoice) => (
                    <Command.Item
                      key={invoice.id}
                      onSelect={() => handleSelect(ROUTES.admin.invoiceDetail(invoice.id))}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink aria-selected:bg-accent-subtle aria-selected:text-accent"
                    >
                      <Receipt className="h-4 w-4 shrink-0" />
                      <span className="truncate">{invoice.invoiceNumber}</span>
                      <span className="ml-auto shrink-0 rounded-full bg-canvas px-1.5 py-0.5 text-[10px] text-ink-muted ring-1 ring-border">{invoice.status}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {searchResults.services.length > 0 && (
                <Command.Group heading="Services" className="px-2 py-1.5 text-xs font-medium text-ink-faint">
                  {searchResults.services.slice(0, 5).map((service) => (
                    <Command.Item
                      key={service.id}
                      onSelect={() => handleSelect(ROUTES.admin.serviceDetail(service.id))}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink aria-selected:bg-accent-subtle aria-selected:text-accent"
                    >
                      <Wrench className="h-4 w-4 shrink-0" />
                      <span className="truncate">{service.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {searchResults.documents.length > 0 && (
                <Command.Group heading="Documents" className="px-2 py-1.5 text-xs font-medium text-ink-faint">
                  {searchResults.documents.slice(0, 5).map((doc) => (
                    <Command.Item
                      key={doc.id}
                      onSelect={() => handleSelect(ROUTES.admin.documents)}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink aria-selected:bg-accent-subtle aria-selected:text-accent"
                    >
                      <FolderOpen className="h-4 w-4 shrink-0" />
                      <span className="truncate">{doc.fileName}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </>
          )}

          {!isSearchMode && (
            <Command.Group heading="Navigate" className="px-2 py-1.5 text-xs font-medium text-ink-faint">
              {NAV_COMMANDS.map((cmd) => (
                <Command.Item
                  key={cmd.path}
                  onSelect={() => handleSelect(cmd.path)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink aria-selected:bg-accent-subtle aria-selected:text-accent"
                >
                  <cmd.icon className="h-4 w-4" />
                  {cmd.label}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-ink-faint">
          <span>Navigate with &uarr; &darr;</span>
          <span>Select with &crarr;</span>
        </div>
      </Command>
    </div>
  );
}
