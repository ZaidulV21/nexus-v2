import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

/** Honest placeholder for a module route that exists in the router/folder
 *  structure but hasn't been built yet - explicitly not a fake dashboard
 *  mockup with invented data. Swapped for the real page module-by-module. */
export function ModuleScaffold({ title, icon: Icon = Construction }: { title: string; icon?: LucideIcon }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="rounded-lg border border-dashed border-border-strong bg-surface">
        <EmptyState
          icon={Icon}
          title={`${title} module not yet built`}
          description="This route is wired up in the app shell and ready - the page itself will be built in its own pass, against the approved design system."
        />
      </div>
    </div>
  );
}
