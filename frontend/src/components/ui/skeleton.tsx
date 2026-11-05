import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Decorative placeholder; the surrounding region announces the loading state.
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-control bg-sunken', className)}
      {...props}
    />
  );
}
