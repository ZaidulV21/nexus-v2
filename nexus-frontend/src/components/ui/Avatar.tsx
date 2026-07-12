import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';

export function Avatar({
  name,
  size = 32,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-subtle', className)}
      style={{ width: size, height: size }}
    >
      <AvatarPrimitive.Fallback className="text-xs font-semibold text-accent">
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
