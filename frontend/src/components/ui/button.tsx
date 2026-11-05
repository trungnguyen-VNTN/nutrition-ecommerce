import type { ComponentProps } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { messages } from '@/app/messages.vi';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'control-transition inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-semibold',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-cream hover:bg-brand-strong',
        secondary: 'bg-lime-soft text-ink hover:bg-lime',
        outline: 'border border-ink bg-surface text-ink hover:bg-sunken',
        ghost: 'text-ink hover:bg-sunken',
        destructive: 'bg-danger text-cream hover:brightness-90',
        // Brand CTA: one per screen (docs/ui-guidelines.md §1).
        sticker:
          'sticker border-2 border-ink bg-lime px-5 font-bold text-ink shadow-sticker hover:bg-lime-strong',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

// shadcn/ui Button pattern: Radix Slot + CVA, with project tokens and loading state.
export function Button({
  className,
  variant,
  asChild = false,
  loading = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      className={cn(buttonVariants({ variant, className }))}
      type={asChild ? undefined : type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? messages.busy : children}
    </Component>
  );
}
