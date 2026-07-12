import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuGroup = DropdownPrimitive.Group;
export const DropdownMenuSub = DropdownPrimitive.Sub;
export const DropdownMenuSubTrigger = DropdownPrimitive.SubTrigger;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: DropdownPrimitive.DropdownMenuContentProps) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[180px] overflow-hidden rounded-lg border border-border bg-surface-raised p-1 shadow-lg animate-scale-in',
          className
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: DropdownPrimitive.DropdownMenuItemProps) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded px-2.5 py-1.5 text-sm text-ink outline-none transition-colors',
        'data-[highlighted]:bg-canvas',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({ className, children, checked, ...props }: DropdownPrimitive.DropdownMenuCheckboxItemProps) {
  return (
    <DropdownPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded py-1.5 pl-7 pr-2.5 text-sm text-ink outline-none data-[highlighted]:bg-canvas',
        className
      )}
      {...props}
    >
      <DropdownPrimitive.ItemIndicator className="absolute left-2">
        <Check className="h-3.5 w-3.5" />
      </DropdownPrimitive.ItemIndicator>
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: DropdownPrimitive.DropdownMenuLabelProps) {
  return <DropdownPrimitive.Label className={cn('px-2.5 py-1.5 text-xs font-medium text-ink-faint', className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: DropdownPrimitive.DropdownMenuSeparatorProps) {
  return <DropdownPrimitive.Separator className={cn('my-1 h-px bg-border', className)} {...props} />;
}

export function DropdownMenuSubContent({ className, ...props }: DropdownPrimitive.DropdownMenuSubContentProps) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.SubContent
        className={cn('z-50 min-w-[160px] rounded-lg border border-border bg-surface-raised p-1 shadow-lg', className)}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export { ChevronRight as DropdownMenuSubTriggerIcon };
