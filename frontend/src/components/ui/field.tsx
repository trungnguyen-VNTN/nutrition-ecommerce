import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const controlClass =
  'control-transition mt-2 block min-h-touch w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink hover:border-ink aria-[invalid=true]:border-danger';

type ControlProps = {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  required?: boolean;
};

// Visible label, persistent hint and an error tied to the control (WCAG form-labels, error-placement).
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: (control: ControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('text-sm', className)}>
      <label htmlFor={id} className="font-semibold">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        required,
      })}
      {hint && (
        <p id={hintId} className="mt-1 text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(controlClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea className={cn(controlClass, 'py-2', className)} {...props} />
  );
}
