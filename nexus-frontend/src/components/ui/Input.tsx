import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leadingIcon, trailingIcon, error, ...props }, ref) => {
    if (leadingIcon || trailingIcon) {
      return (
        <div className="relative flex items-center">
          {leadingIcon && (
            <span className="pointer-events-none absolute left-3 flex text-ink-faint">{leadingIcon}</span>
          )}
          <input
            ref={ref}
            className={cn(
              'h-9 w-full rounded border bg-surface px-3 text-sm text-ink placeholder:text-ink-faint transition-colors',
              'border-border focus-visible:border-accent',
              leadingIcon && 'pl-9',
              trailingIcon && 'pr-9',
              error && 'border-danger focus-visible:ring-danger/30',
              className
            )}
            {...props}
          />
          {trailingIcon && <span className="pointer-events-none absolute right-3 flex text-ink-faint">{trailingIcon}</span>}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded border bg-surface px-3 text-sm text-ink placeholder:text-ink-faint transition-colors',
          'border-border focus-visible:border-accent',
          error && 'border-danger focus-visible:ring-danger/30',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
