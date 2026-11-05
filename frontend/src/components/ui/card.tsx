import type { ComponentProps, ElementType } from 'react';
import { cn } from '@/lib/utils';

// Surfaces use a hairline border, not shadows (ui-guidelines §2).
export function Card<T extends ElementType = 'div'>({
  as,
  className,
  ...props
}: { as?: T } & ComponentProps<T>) {
  const Component = as ?? 'div';
  return (
    <Component
      className={cn(
        'rounded-card border border-line bg-surface p-4 md:p-6',
        className,
      )}
      {...props}
    />
  );
}
