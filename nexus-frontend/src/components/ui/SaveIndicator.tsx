import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Small inline indicator for autosaving forms - drop next to a field or in a form header. */
export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs',
        status === 'error' ? 'text-danger' : 'text-ink-muted'
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" /> Saving...
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3 text-success" /> Saved
        </>
      )}
      {status === 'error' && <>Couldn&apos;t save - retrying</>}
    </span>
  );
}
