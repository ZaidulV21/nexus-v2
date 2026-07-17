import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/app/AuthContext';
import { useToast } from '@/hooks/useToast';
import { useMarkThreadRead, useMessageThread, useSendMessage } from '@/queries/useMessages';
import { MessageBubble } from '@/components/common/MessageBubble';
import { ApiError } from '@/lib/api';

const THREAD_PAGE_SIZE = 100;

export function PortalMessagesPage() {
  const { actor } = useAuth();
  const clientId = actor?.id ?? '';
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch } = useMessageThread(clientId, { pageSize: THREAD_PAGE_SIZE });
  const sendMessage = useSendMessage(clientId);
  const markRead = useMarkThreadRead(clientId);

  const messages = useMemo(() => data?.items ?? [], [data]);
  const hasUnreadFromAdmin = useMemo(
    () => messages.some((message) => message.senderType === 'ADMIN' && !message.isRead),
    [messages]
  );

  // Opening the thread counts as reading it - matches the backend's
  // "mark the OTHER party's messages read" semantics.
  useEffect(() => {
    if (hasUnreadFromAdmin && !markRead.isPending) {
      markRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnreadFromAdmin]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;
    try {
      await sendMessage.mutateAsync(body);
      setDraft('');
    } catch (err) {
      toast({
        title: 'Message not sent',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Chat directly with the business - questions, approvals, and follow-ups stay in one thread."
        actions={
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            <MessageSquare className="h-4 w-4" /> Client view
          </span>
        }
      />

      <Card>
        <CardContent className="flex h-[60vh] flex-col p-0">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-2/3" />
                <Skeleton className="ml-auto h-14 w-2/3" />
                <Skeleton className="h-14 w-1/2" />
              </div>
            ) : isError ? (
              <ErrorState description="Couldn't load your conversation." onRetry={refetch} />
            ) : messages.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No messages yet"
                description="Start the conversation - the business will reply here."
              />
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.senderType === 'CLIENT'}
                  otherPartyLabel="Nexus team"
                />
              ))
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <Textarea
                rows={2}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message... (Enter to send, Shift+Enter for a new line)"
                className="flex-1 resize-none"
              />
              <Button onClick={handleSend} disabled={!draft.trim()} loading={sendMessage.isPending}>
                <Send className="h-4 w-4" /> Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
