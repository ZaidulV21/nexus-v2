import { type ReactNode } from 'react';
import { Sidebar, MobileSidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useDisclosure } from '@/hooks/useDisclosure';
import type { BreadcrumbItem } from '@/components/ui/Breadcrumbs';

/** The Admin app's persistent shell: fixed sidebar + sticky top nav.
 *  Every Admin page renders inside this via <Outlet /> in the router config. */
export function AppShell({ children, breadcrumbs }: { children: ReactNode; breadcrumbs: BreadcrumbItem[] }) {
  const mobileSidebar = useDisclosure(false);

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <MobileSidebar open={mobileSidebar.isOpen} onClose={mobileSidebar.close} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav breadcrumbs={breadcrumbs} onOpenMobileSidebar={mobileSidebar.open} />
        <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
