import { messages } from '@/app/messages.vi';
import { Note } from '@/components/ui/note';
import type { Product } from '@/lib/api/catalog.types';
import { energySplit, formatAmount, readyNutrition } from '@/lib/nutrition';
import { cn } from '@/lib/utils';

const stroke = {
  protein: 'var(--macro-protein)',
  carb: 'var(--macro-carb)',
  fat: 'var(--macro-fat)',
} as const;
const radius = 42;
const circumference = 2 * Math.PI * radius;
// Gap between segments so slices stay distinguishable without colour.
const gap = 3;

// Energy split by macro (Atwater). Drawn only with complete data; legend repeats every value in text.
export function Donut({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const ready = readyNutrition(product);
  const split = ready && energySplit(ready.nutrition);
  if (!ready || !split)
    return (
      <Note tone="missing" className={className}>
        {messages.nutritionMissing}
      </Note>
    );
  const percent = (share: number) => `${Math.round(share * 100)}%`;
  const summary = messages.energySummary(
    formatAmount(ready.nutrition.calories),
    split
      .map(
        ({ macro, share }) =>
          `${messages.macroLabels[macro]} ${percent(share)}`,
      )
      .join(', '),
  );
  // Start of each slice along the circle, precomputed so render stays pure.
  const starts = split.map((_, i) =>
    split
      .slice(0, i)
      .reduce((sum, part) => sum + part.share * circumference, 0),
  );
  return (
    <figure className={cn('flex flex-wrap items-center gap-6', className)}>
      <svg
        viewBox="0 0 100 100"
        className="size-36 -rotate-90"
        role="img"
        aria-label={summary}
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--sunken)"
          strokeWidth="12"
        />
        {split.map(({ macro, share }, i) => {
          if (share <= 0) return null;
          const length = Math.max(share * circumference - gap, 0.5);
          return (
            <circle
              key={macro}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={stroke[macro]}
              strokeWidth="12"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-(starts[i] ?? 0)}
            />
          );
        })}
        <text
          x="50"
          y="50"
          transform="rotate(90 50 50)"
          fontSize="18"
          className="fill-ink font-display font-extrabold"
          textAnchor="middle"
          dominantBaseline="central"
          aria-hidden="true"
        >
          {formatAmount(ready.nutrition.calories)}
        </text>
      </svg>
      <figcaption className="space-y-2 text-sm">
        <p className="font-semibold">{messages.energySplit}</p>
        <ul className="space-y-1">
          {split.map(({ macro, kcal, share }) => (
            <li key={macro} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-pill"
                style={{ background: stroke[macro] }}
              />
              <span className="w-20 text-ink-muted">
                {messages.macroLabels[macro]}
              </span>
              <strong className="tabular-nums">{percent(share)}</strong>
              <span className="text-ink-muted tabular-nums">
                ({formatAmount(Math.round(kcal))} kcal)
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-muted">
          kcal /{' '}
          {messages.serving(ready.servingSize, ready.servingUnit).toLowerCase()}
        </p>
      </figcaption>
    </figure>
  );
}
