import { Link } from 'react-router-dom';
import { ArrowRight, Check, Eye, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubService } from '@/types';
import { subServiceIconMap } from './subServiceIcons';

interface SubServiceSelectCardProps {
  /** Parent service slug — used to build the sub-service detail route. */
  serviceSlug: string;
  /** CMS sub-service to render. */
  sub: SubService;
  /** Whether this sub-service is currently selected for the quote. */
  selected: boolean;
  /** Toggle selection. Clicking the card content instead navigates. */
  onToggle: (subId: string) => void;
  /** True when this sub-service's detail page is the current route. */
  viewing?: boolean;
}

/**
 * Public sub-service card with a clear selection control that coexists with
 * detail-page navigation:
 *  - Clicking the control toggles selection for the Get Quote request.
 *  - Clicking the image/title or "View Details" opens the existing
 *    /services/:slug/:subSlug detail page.
 * Everything rendered is data-driven from the CMS SubService record.
 */
export function SubServiceSelectCard({
  serviceSlug,
  sub,
  selected,
  onToggle,
  viewing = false,
}: SubServiceSelectCardProps) {
  const detailUrl = `/services/${serviceSlug}/${sub.slug}`;
  const image = sub.heroImage || sub.gallery?.[0];
  const Icon = subServiceIconMap[sub.icon ?? 'Wrench'] ?? subServiceIconMap['Wrench'];
  const summary = sub.shortDescription?.trim() || sub.description?.trim();

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-surface transition-all duration-300',
        selected
          ? 'border-accent shadow-lg shadow-accent/10 ring-2 ring-accent/30'
          : 'border-border hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5',
        viewing && !selected && 'border-accent/40'
      )}
    >
      {/* Image — clicking opens the detail page */}
      <Link to={detailUrl} aria-label={`View ${sub.name} details`} className="relative block h-40 w-full shrink-0 overflow-hidden bg-canvas">
        {image ? (
          <img
            src={image}
            alt={sub.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-subtle via-canvas to-canvas">
            <Icon className="h-10 w-10 text-accent" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark/30 via-transparent to-transparent" />
      </Link>

      {/* Selection control — independent of navigation */}
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${selected ? 'Remove' : 'Add'} ${sub.name} to your request`}
        onClick={() => onToggle(sub.id)}
        className={cn(
          'absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-sm backdrop-blur-sm transition-all duration-200',
          selected
            ? 'border-accent bg-accent text-white'
            : 'border-border-strong bg-surface/90 text-ink-muted hover:border-accent hover:bg-accent hover:text-white'
        )}
      >
        {selected ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>

      {/* Viewing badge */}
      {viewing && (
        <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-dark/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <Eye className="h-3 w-3" />
          Viewing
        </span>
      )}

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <Link to={detailUrl} className="group/title">
          <h3 className="text-base font-semibold text-ink transition-colors group-hover/title:text-accent">{sub.name}</h3>
        </Link>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-muted line-clamp-2">
          {summary || 'Explore this service option, its details and what it includes.'}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3.5">
          {sub.startingPrice ? (
            <span className="text-xs font-semibold text-ink">
              From <span className="text-accent">{sub.startingPrice}</span>
            </span>
          ) : (
            <span className={cn('text-xs', selected ? 'font-medium text-accent' : 'text-ink-faint')}>
              {selected ? 'Added to request' : 'Add to request'}
            </span>
          )}
          <Link
            to={detailUrl}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-all hover:gap-2"
          >
            View Details
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
