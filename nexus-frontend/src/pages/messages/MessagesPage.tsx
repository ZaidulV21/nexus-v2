import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/useToast';
import { useConversations, useMarkThreadRead, useMessageThread, useSendMessage } from '@/queries/useMessages';
import { MessageBubble } from '@/components/common/MessageBubble';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';
import type { ConversationPreview } from '@/services/messageService';

const THREAD_PAGE_SIZE = 100;

function conversationName(conversation: ConversationPreview) {
  return (
    conversation.client?.companyName ||
    conversation.client?.contactName ||
    conversation.client?.clientNumber ||
    'Client'
  );
}

function ConversationListItem({
  conversation,
  isActive,
  onSelect,
}: {
  conversation: ConversationPreview;
  isActive: boolean;
  onSelect: () => void;
}) {
  const lastMessage = conversation.messages[0];
  const unread = conversation.unreadCount ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0',
        isActive ? 'bg-accent-subtle' : 'hover:bg-canvas'
      )}
    >
      <Avatar name={conversationName(conversation)} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('truncate text-sm', unread > 0 ? 'font-semibold text-ink' : 'font-medium text-ink')}>
            {conversationName(conversation)}
          </p>
          {lastMessage && (
            <span className="shrink-0 text-[11px] text-ink-faint">{formatRelativeTime(lastMessage.createdAt)}</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-ink-muted">
            {lastMessage ? `${lastMessage.senderType === 'ADMIN' ? 'You: ' : ''}${lastMessage.body}` : 'No messages yet'}
          </p>
          {unread > 0 && (
            <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function MessageThread({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch } = useMessageThread(clientId, { pageSize: THREAD_PAGE_SIZE });
  const sendMessage = useSendMessage(clientId);
  const markRead = useMarkThreadRead(clientId);

  const messages = useMemo(() => data?.items ?? [], [data]);
  const hasUnreadFromClient = useMemo(
    () => messages.some((message) => message.senderType === 'CLIENT' && !message.isRead),
    [messages]
  );

  // Opening (or receiving into) a thread marks the client's messages read.
  useEffect(() => {
    if (hasUnreadFromClient && !markRead.isPending) {
      markRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnreadFromClient, clientId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, clientId]);

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
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <Avatar name={clientName} size={28} />
        <p className="text-sm font-medium text-ink">{clientName}</p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="ml-auto h-14 w-2/3" />
          </div>
        ) : isError ? (
          <ErrorState description="Couldn't load this conversation." onRetry={refetch} />
        ) : messages.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No messages yet" description="Send the first message to this client." />
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderType === 'ADMIN'}
              otherPartyLabel="Client"
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
    </div>
  );
}

export function MessagesPage() {
  const { data: conversations, isLoading, isError, refetch } = useConversations();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Auto-select the first conversation once loaded.
  useEffect(() => {
    if (!selectedClientId && conversations && conversations.length > 0) {
      setSelectedClientId(conversations[0].clientId);
    }
  }, [conversations, selectedClientId]);

  const selected = conversations?.find((conversation) => conversation.clientId === selectedClientId);

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Two-way chat with clients. Unread counts update automatically as clients write in."
      />

      <Card>
        <CardContent className="p-0">
          <div className="grid h-[65vh] grid-cols-1 md:grid-cols-[280px_1fr]">
            <div className="overflow-y-auto border-b border-border md:border-b-0 md:border-r">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : isError ? (
                <div className="p-4">
                  <ErrorState description="Couldn't load conversations." onRetry={refetch} />
                </div>
              ) : !conversations || conversations.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No conversations"
                  description="Conversations start when a client messages you, or when you message a converted client."
                />
              ) : (
                conversations.map((conversation) => (
                  <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={conversation.clientId === selectedClientId}
                    onSelect={() => setSelectedClientId(conversation.clientId)}
                  />
                ))
              )}
            </div>

            <div className="min-h-0">
              {selected ? (
                <MessageThread clientId={selected.clientId} clientName={conversationName(selected)} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <EmptyState
                    icon={MessageSquare}
                    title="Select a conversation"
                    description="Pick a client on the left to read and reply."
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
