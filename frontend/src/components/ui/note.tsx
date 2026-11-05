import type { ReactNode } from 'react';
import { Info, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const tones = {
  info: 'border-line bg-lime-soft text-ink',
  // Missing / unverified data: dashed warning box, never an empty cell or 0.
  missing: 'border-dashed border-warning bg-warning-tint text-warning',
  medical: 'border-line bg-sunken text-ink-muted',
} as const;

export function Note({
  tone = 'info',
  className,
  children,
}: {
  tone?: keyof typeof tones;
  className?: string;
  children: ReactNode;
}) {
  const Glyph = tone === 'missing' ? WarningCircle : Info;
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-control border p-3 text-sm',
        tones[tone],
        className,
      )}
    >
      <Glyph className="icon mt-0.5" />
      <span>{children}</span>
    </p>
  );
}
