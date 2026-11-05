import type { Nutrition, Product } from './api/catalog.types';

export type ReadyNutrition = {
  nutrition: Nutrition;
  servingSize: number;
  servingUnit: string;
};

// Single fail-closed gate (invariant 3): numbers are shown only when the API marks
// nutrition complete AND every field the view needs is present.
export function readyNutrition(product: Product): ReadyNutrition | null {
  if (
    !product.nutrition_complete ||
    !product.nutrition ||
    product.serving_size === null ||
    product.serving_unit === null
  )
    return null;
  return {
    nutrition: product.nutrition,
    servingSize: product.serving_size,
    servingUnit: product.serving_unit,
  };
}

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
export const formatAmount = (value: number) => number.format(value);

// Atwater factors: protein 4, carbohydrate 4, fat 9 kcal per gram.
export function energySplit(nutrition: Nutrition) {
  const parts = [
    ['protein', nutrition.protein_g * 4],
    ['carb', nutrition.carbs_g * 4],
    ['fat', nutrition.fat_g * 9],
  ] as const;
  const total = parts.reduce((sum, [, kcal]) => sum + kcal, 0);
  if (total <= 0) return null;
  return parts.map(([macro, kcal]) => ({
    macro,
    kcal,
    share: kcal / total,
  }));
}
