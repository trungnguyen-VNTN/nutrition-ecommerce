import { messages } from '@/app/messages.vi';
import { Note } from '@/components/ui/note';
import { macroDot, type Macro } from '@/components/ui/macro';
import type { Nutrition, Product } from '@/lib/api/catalog.types';
import { formatAmount, readyNutrition } from '@/lib/nutrition';
import { cn } from '@/lib/utils';

type Row = {
  key: Exclude<keyof Nutrition, 'source' | 'calories'>;
  macro?: Macro;
  nested?: boolean;
};
const rows: Row[] = [
  { key: 'protein_g', macro: 'protein' },
  { key: 'carbs_g', macro: 'carb' },
  { key: 'sugar_g', nested: true },
  { key: 'fat_g', macro: 'fat' },
  { key: 'fiber_g', macro: 'fiber' },
  { key: 'sodium_mg' },
];

// Printed-label look: heavy frame, energy first, one row per nutrient.
// Missing values say so in text; nothing is rendered as 0 or left blank.
export function NutritionLabel({
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
  const { nutrition, servingSize, servingUnit } = ready;
  return (
    <div
      className={cn(
        'overflow-hidden rounded-card border-2 border-ink bg-surface',
        className,
      )}
    >
      <table className="w-full border-collapse text-sm">
        <caption className="px-4 pt-4 text-left">
          <span className="block font-display text-2xl font-extrabold">
            {messages.nutritionFacts}
          </span>
          <span className="mt-1 block border-b-8 border-ink pb-2 text-ink-muted">
            {messages.serving(servingSize, servingUnit)}
          </span>
        </caption>
        <tbody>
          <tr className="border-b-4 border-ink">
            <th scope="row" className="px-4 py-3 text-left text-base font-bold">
              {messages.nutritionLabels.calories}
            </th>
            <td className="px-4 py-3 text-right font-display text-3xl font-extrabold tabular-nums">
              {formatAmount(nutrition.calories)}
            </td>
          </tr>
          {rows.map(({ key, macro, nested }) => {
            const value = nutrition[key];
            return (
              <tr key={key} className="border-b border-line last:border-b-0">
                <th
                  scope="row"
                  className={cn(
                    'px-4 py-2.5 text-left',
                    nested
                      ? 'pl-9 font-normal text-ink-muted'
                      : 'font-semibold',
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    {macro && (
                      <span
                        aria-hidden="true"
                        className={cn('size-2.5 rounded-pill', macroDot[macro])}
                      />
                    )}
                    {messages.nutritionLabels[key]}
                  </span>
                </th>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {value === null ? (
                    <span className="whitespace-nowrap rounded-pill border border-dashed border-warning bg-warning-tint px-2 py-0.5 text-xs font-semibold text-warning">
                      {messages.missingValue}
                    </span>
                  ) : (
                    formatAmount(value)
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
