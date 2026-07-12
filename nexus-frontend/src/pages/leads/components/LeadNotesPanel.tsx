import { useState } from 'react';
import { Send } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/lib/format';
import { useToast } from '@/hooks/useToast';
import { useLeadNotes, useAddLeadNote } from '@/queries/useLeads';
import { ApiError } from '@/lib/api';

export function LeadNotesPanel({ leadId }: { leadId: string }) {
  const [note, setNote] = useState('');
  const { data: notes, isLoading, isError, refetch } = useLeadNotes(leadId);
  const addNote = useAddLeadNote(leadId);
  const { toast } = useToast();

  async function handleSubmit() {
    if (!note.trim()) return;
    try {
      await addNote.mutateAsync(note.trim());
      setNote('');
    } catch (err) {
      toast({
        title: 'Could not save note',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Textarea
          placeholder="Log a call, follow-up, or note about this lead..."
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1"
        />
        <Button size="sm" className="self-end" loading={addNote.isPending} onClick={handleSubmit} disabled={!note.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : isError ? (
        <ErrorState description="Couldn't load notes." onRetry={refetch} />
      ) : !notes || notes.length === 0 ? (
        <EmptyState title="No notes yet" description="Call logs and follow-up notes will appear here." />
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border bg-canvas p-3">
              <p className="text-sm text-ink">{n.note}</p>
              <p className="mt-1.5 text-xs text-ink-faint">{formatRelativeTime(n.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
