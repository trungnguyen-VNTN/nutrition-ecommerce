import { Minus, Plus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

// Quantity stepper bounded by stock; buttons are named after the item for screen readers.
export function Qty({
  value,
  min = 1,
  max,
  label,
  disabled,
  onChange,
  className,
}: {
  value: number;
  min?: number;
  max: number;
  label: string;
  disabled?: boolean;
  onChange: (value: number) => void;
  className?: string;
}) {
  const step =
    'control-transition grid size-11 place-items-center rounded-control text-ink hover:bg-sunken';
  return (
    <div
      role="group"
      aria-label={`Số lượng ${label}`}
      className={cn(
        'inline-flex items-center rounded-control border border-line-strong bg-surface',
        className,
      )}
    >
      <button
        type="button"
        className={step}
        aria-label={`Giảm ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus />
      </button>
      <output
        aria-live="polite"
        className="min-w-10 text-center font-semibold tabular-nums"
      >
        {value}
      </output>
      <button
        type="button"
        className={step}
        aria-label={`Tăng ${label}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </button>
    </div>
  );
}
