import { cn } from '@/lib/utils';
import { sanitizeRichText, looksLikeHtml } from '@/lib/richText';

/**
 * Render CMS rich text safely. HTML content is sanitized with DOMPurify before
 * it touches dangerouslySetInnerHTML; plain text (legacy `\n\n`-separated
 * paragraphs) is rendered as-is with preserved line breaks.
 */
export function RichTextContent({
  html,
  className,
  prose = true,
}: {
  html: string | null | undefined;
  className?: string;
  /** Wrap in Tailwind `prose` typography. Off for already-styled contexts. */
  prose?: boolean;
}) {
  if (!html || !html.trim()) return null;

  if (looksLikeHtml(html)) {
    const sanitized = sanitizeRichText(html);
    if (!sanitized) return null;
    return (
      <div
        className={cn(
          prose &&
            'prose prose-sm max-w-none prose-p:my-2 prose-headings:font-semibold prose-headings:text-ink prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:border-l-accent',
          className
        )}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  return <div className={cn('whitespace-pre-line', className)}>{html.trim()}</div>;
}
