import { messages } from '@/app/messages.vi';
import type { Product } from '@/lib/api/catalog.types';

export function NutritionTable({ product }: { product: Product }) {
  if (
    !product.nutrition_complete ||
    !product.nutrition ||
    product.serving_size === null ||
    product.serving_unit === null
  ) {
    return (
      <p className="rounded-control bg-allergen-bg p-4 text-allergen-text">
        {messages.nutritionMissing}
      </p>
    );
  }
  return (
    <table className="w-full text-sm">
      <caption className="pb-4 text-left text-neutral-700">
        {messages.serving(product.serving_size, product.serving_unit)}
      </caption>
      <tbody>
        {(
          Object.keys(
            messages.nutritionLabels,
          ) as (keyof typeof messages.nutritionLabels)[]
        ).map((key) => {
          const value = product.nutrition?.[key];
          return (
            <tr key={key} className="border-b border-neutral-200">
              <th scope="row" className="py-3 text-left font-medium">
                {messages.nutritionLabels[key]}
              </th>
              <td className="py-3 text-right tabular-nums">
                {value === null || value === undefined
                  ? messages.missingValue
                  : new Intl.NumberFormat('vi-VN').format(value)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
