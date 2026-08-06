import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subServiceIconMap } from './subServiceIcons';
import type { SubServiceConfig } from '../config/subServices';

interface SubServiceNavProps {
  serviceSlug: string;
  serviceName: string;
  subServices: SubServiceConfig[];
  activeSubSlug?: string;
}

/**
 * Horizontal "service family" cards shown on service detail pages.
 * Each card deep-links to its own SEO-friendly URL; the active option is
 * highlighted. Navigation is purely client-side (no page reload).
 */
export function SubServiceNav({ serviceSlug, serviceName, subServices, activeSubSlug }: SubServiceNavProps) {
  if (subServices.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
        <Sparkles className="h-3.5 w-3.5" />
        {serviceName} — service options
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1"
      >
        <Link
          to={`/services/${serviceSlug}`}
          aria-current={!activeSubSlug ? 'page' : undefined}
          className={cn(
            'shrink-0 rounded-xl border px-4 py-3 text-left transition-all duration-200',
            !activeSubSlug
              ? 'border-accent bg-accent text-white shadow-sm'
              : 'border-border bg-canvas text-ink-muted hover:border-accent/40 hover:text-ink'
          )}
        >
          <span className="block text-sm font-semibold">{serviceName}</span>
          <span className={cn('mt-0.5 block text-[11px]', !activeSubSlug ? 'text-white/80' : 'text-ink-faint')}>
            All options
          </span>
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
                'group flex min-w-[150px] shrink-0 flex-col gap-2 rounded-xl border px-4 py-3 transition-all duration-200',
                isActive
                  ? 'border-accent bg-accent text-white shadow-sm'
                  : 'border-border bg-canvas text-ink hover:border-accent/40 hover:text-ink'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-accent')} />
              <span className="text-sm font-semibold leading-tight">{sub.name}</span>
              <span className={cn('text-[11px] leading-snug line-clamp-2', isActive ? 'text-white/80' : 'text-ink-faint')}>
                {sub.shortDescription}
              </span>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}
