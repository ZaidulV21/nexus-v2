import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded bg-[linear-gradient(90deg,rgb(var(--color-border))_25%,rgb(var(--color-canvas))_50%,rgb(var(--color-border))_75%)] bg-[length:200%_100%]',
        className
      )}
    />
  );
}

export function SkeletonTableRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-3.5">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn('h-4', c === 0 ? 'w-1/4' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <Skeleton className="mb-3 h-3.5 w-24" />
      <Skeleton className="h-7 w-32" />
    </div>
  );
}
