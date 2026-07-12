import { type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface ActiveFilter {
  key: string;
  label: string;
}

/** A row of filter controls plus active-filter chips. Compose Selects/DatePickers
 *  as children; this component only handles layout + the "active filters" chip row. */
export function FilterBar({
  children,
  activeFilters,
  onRemoveFilter,
  onClearAll,
  className,
}: {
  children: ReactNode;
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (key: string) => void;
  onClearAll?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-3.5 w-3.5 text-ink-faint" />
        {children}
      </div>
      {!!activeFilters?.length && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 rounded-sm border border-border bg-canvas px-2 py-0.5 text-xs text-ink-muted"
            >
              {f.label}
              {onRemoveFilter && (
                <button onClick={() => onRemoveFilter(f.key)} className="hover:text-ink">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {onClearAll && (
            <Button variant="link" size="sm" onClick={onClearAll} className="text-xs">
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
