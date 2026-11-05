import { messages } from '@/app/messages.vi';
import { Note } from '@/components/ui/note';
import { macroDot, type Macro } from '@/components/ui/macro';
import type { Product } from '@/lib/api/catalog.types';
import { formatAmount, readyNutrition } from '@/lib/nutrition';
import { cn } from '@/lib/utils';

// Gram share of protein / carb / fat. The bar is decorative; the legend carries the numbers.
export function MacroBar({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const ready = readyNutrition(product);
  if (!ready)
    return (
      <Note tone="missing" className={className}>
        {messages.nutritionMissing}
      </Note>
    );
  const parts: [Extract<Macro, 'protein' | 'carb' | 'fat'>, number][] = [
    ['protein', ready.nutrition.protein_g],
    ['carb', ready.nutrition.carbs_g],
    ['fat', ready.nutrition.fat_g],
  ];
  const total = parts.reduce((sum, [, grams]) => sum + grams, 0);
  return (
    <figure className={cn('space-y-2', className)}>
      <figcaption className="sr-only">{messages.macroSplit}</figcaption>
      {total > 0 && (
        <div
          aria-hidden="true"
          className="flex h-3 gap-0.5 overflow-hidden rounded-pill bg-sunken"
        >
          {parts
            .filter(([, grams]) => grams > 0)
            .map(([macro, grams]) => (
              <span
                key={macro}
                className={macroDot[macro]}
                style={{ width: `${(grams / total) * 100}%` }}
              />
            ))}
        </div>
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {parts.map(([macro, grams]) => (
          <li key={macro} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn('size-2 rounded-pill', macroDot[macro])}
            />
            <span className="text-ink-muted">
              {messages.macroLabels[macro]}
            </span>
            <strong className="tabular-nums">{formatAmount(grams)} g</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}
