import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[88px] w-full resize-y rounded border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors',
        'border-border focus-visible:border-accent',
        error && 'border-danger focus-visible:ring-danger/30',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
