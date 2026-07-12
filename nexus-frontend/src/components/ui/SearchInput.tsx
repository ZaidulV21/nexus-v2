import { Search, X } from 'lucide-react';
import { Input, type InputProps } from './Input';
import { cn } from '@/lib/utils';

export function SearchInput({
  value,
  onChange,
  onClear,
  className,
  ...props
}: InputProps & { onClear?: () => void }) {
  return (
    <div className={cn('relative', className)}>
      <Input
        value={value}
        onChange={onChange}
        leadingIcon={<Search className="h-3.5 w-3.5" />}
        className="pr-8"
        {...props}
      />
      {!!value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
