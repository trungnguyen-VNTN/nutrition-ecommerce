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
        primary: 'bg-primary-600 text-neutral-50 hover:bg-primary-700',
        secondary: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
        ghost: 'text-neutral-700 hover:bg-neutral-100',
        destructive: 'bg-danger text-neutral-50',
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
