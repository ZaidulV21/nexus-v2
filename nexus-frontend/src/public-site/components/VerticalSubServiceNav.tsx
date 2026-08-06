import { Link } from 'react-router-dom';
import { Sparkles, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subServiceIconMap } from './subServiceIcons';
import type { SubServiceConfig } from '../config/subServices';

interface VerticalSubServiceNavProps {
  serviceSlug: string;
  serviceName: string;
  subServices: SubServiceConfig[];
  activeSubSlug?: string;
}

/** Left-hand sticky navigation listing every sub-service under a service.
 *  Purely client-side links — switching never triggers a page reload. */
export function VerticalSubServiceNav({
  serviceSlug,
  serviceName,
  subServices,
  activeSubSlug,
}: VerticalSubServiceNavProps) {
  if (subServices.length === 0) return null;

  return (
    <nav className="sticky top-28 rounded-2xl border border-border bg-surface p-4 shadow-xs">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
        <Sparkles className="h-3.5 w-3.5" />
        {serviceName}
      </div>
      <div className="space-y-1">
        <Link
          to={`/services/${serviceSlug}`}
          aria-current={!activeSubSlug ? 'page' : undefined}
          className={cn(
            'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            !activeSubSlug
              ? 'bg-accent text-white shadow-sm'
              : 'text-ink-muted hover:bg-canvas hover:text-ink'
          )}
        >
          All Options
        </Link>

        {subServices.map((sub) => {
          const Icon = subServiceIconMap[sub.icon] ?? Wrench;
          const isActive = sub.slug === activeSubSlug;
          return (
            <Link
              key={sub.slug}
              to={`/services/${serviceSlug}/${sub.slug}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive ? 'bg-accent-subtle' : 'text-ink-muted hover:bg-canvas hover:text-ink'
              )}
            >
              <Icon
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  isActive ? 'text-accent' : 'text-ink-faint group-hover:text-accent'
                )}
              />
              <span className="min-w-0">
                <span className={cn('block font-medium leading-snug', isActive && 'text-accent')}>
                  {sub.name}
                </span>
                <span className="block text-xs leading-snug text-ink-faint line-clamp-2">
                  {sub.shortDescription}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
