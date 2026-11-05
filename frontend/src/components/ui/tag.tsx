import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const tagVariants = cva(
  'inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-xs font-semibold',
  {
    variants: {
      tone: {
        neutral: 'border-line bg-sunken text-ink',
        lime: 'border-transparent bg-lime text-ink',
        success: 'border-transparent bg-success-tint text-success',
        warning: 'border-warning bg-warning-tint text-warning',
        danger: 'border-transparent bg-danger-tint text-danger',
      },
      // Dashed = data missing or not verified (fail-closed, ui-guidelines §6).
      dashed: { true: 'border-dashed', false: '' },
    },
    defaultVariants: { tone: 'neutral', dashed: false },
  },
);

// Status labels always carry text; colour is never the only signal.
export function Tag({
  tone,
  dashed,
  icon,
  className,
  children,
}: VariantProps<typeof tagVariants> & {
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn(tagVariants({ tone, dashed }), className)}>
      {icon}
      <span>{children}</span>
    </span>
  );
}
