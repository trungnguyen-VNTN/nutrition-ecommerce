import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { macroDot, macroTint, type Macro } from './macro';

export function Pill({
  macro,
  className,
  children,
}: {
  macro: Macro;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold text-ink tabular-nums',
        macroTint[macro],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-pill', macroDot[macro])}
      />
      {children}
    </span>
  );
}
