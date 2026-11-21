import type { ReadyNutrition } from '@/lib/nutrition';
import { formatAmount } from '@/lib/nutrition';
import { cn } from '@/lib/utils';

// Mini nutrition label: four numbers under a heavy rule, like the top of a spec sheet.
// A description list keeps "term then value" for screen readers; CSS puts the value on top.
export function SpecRow({
  ready,
  highlight,
  className,
}: {
  ready: ReadyNutrition;
  /** Which number matches what the shopper is looking for (lime marker). */
  highlight?: 'protein';
  className?: string;
}) {
  const { nutrition } = ready;
  const cells = [
    { key: 'calories', term: 'kcal', unit: '', value: nutrition.calories },
    {
      key: 'protein',
      term: 'protein',
      unit: ' (gam)',
      value: nutrition.protein_g,
    },
    { key: 'carb', term: 'carb', unit: ' (gam)', value: nutrition.carbs_g },
    { key: 'fat', term: 'béo', unit: ' (gam)', value: nutrition.fat_g },
  ] as const;
  return (
    <dl className={cn('spec-row', className)}>
      {cells.map((cell) => (
        <div key={cell.key} className="spec-cell">
          <dt>
            {cell.term}
            {cell.unit && <span className="sr-only">{cell.unit}</span>}
          </dt>
          <dd>
            <span className={cn(highlight === cell.key && 'spec-mark')}>
              {formatAmount(cell.value)}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
