import type { ReactNode } from 'react';
import { CheckCircle, Info, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const tones = {
  info: 'border-line bg-lime-soft text-ink',
  success: 'border-transparent bg-success-tint text-success',
  error: 'border-danger bg-danger-tint text-danger',
  // Missing / unverified data: dashed warning box, never an empty cell or 0.
  missing: 'border-dashed border-warning bg-warning-tint text-warning',
  medical: 'border-line bg-sunken text-ink-muted',
} as const;
const glyphs = {
  info: Info,
  success: CheckCircle,
  error: WarningCircle,
  missing: WarningCircle,
  medical: Info,
} as const;

export function Note({
  tone = 'info',
  role,
  className,
  children,
}: {
  tone?: keyof typeof tones;
  role?: 'status' | 'alert';
  className?: string;
  children: ReactNode;
}) {
  const Glyph = glyphs[tone];
  return (
    <p
      role={role}
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
