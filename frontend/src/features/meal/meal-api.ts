import { z } from 'zod';
import { requestJson } from '@/lib/api/client';
import { isDietLabel } from '@/lib/diet-labels';

const amount = z.number().finite().nonnegative();
const amounts = z.object({
  calories: amount,
  protein_g: amount,
  carbs_g: amount,
  fat_g: amount,
  // Unknown optional values stay null, never 0 (invariant 3).
  sugar_g: amount.nullable(),
  fiber_g: amount.nullable(),
  sodium_mg: amount.nullable(),
});
export const analysisSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.number().int().positive(),
      name: z.string(),
      grams: amount,
      complete: z.boolean(),
      amounts: amounts.nullable(),
    }),
  ),
  total_grams: amount,
  total: amounts,
  complete: z.boolean(),
  incomplete_products: z.array(z.string()),
  diet_labels: z
    .array(z.string())
    .transform((labels) => labels.filter(isDietLabel)),
});
export type MealAnalysis = z.infer<typeof analysisSchema>;
export type MealItem = { productId: number; grams: number };

export const maxItems = 30;
export const maxGrams = 5000;

/** `?items=12:150,7:100` keeps a meal shareable and linkable from a product page. */
export function parseItems(value: string | null): MealItem[] {
  if (!value) return [];
  const items: MealItem[] = [];
  for (const part of value.split(',').slice(0, maxItems)) {
    const [id = NaN, grams = NaN] = part.split(':').map(Number);
    if (
      Number.isInteger(id) &&
      id > 0 &&
      !items.some((item) => item.productId === id) &&
      Number.isFinite(grams) &&
      grams >= 1 &&
      grams <= maxGrams
    )
      items.push({ productId: id, grams });
  }
  return items;
}

export const formatItems = (items: MealItem[]) =>
  items.map((item) => `${item.productId}:${item.grams}`).join(',');

export async function analyzeMeal(
  items: MealItem[],
  signal?: AbortSignal,
): Promise<MealAnalysis> {
  return analysisSchema.parse(
    await requestJson('nutrition/analyze', {
      method: 'POST',
      signal,
      body: JSON.stringify({
        items: items.map((item) => ({
          product_id: item.productId,
          grams: item.grams,
        })),
      }),
    }),
  );
}
