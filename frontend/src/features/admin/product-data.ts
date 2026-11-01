import { z } from 'zod';

export const nutrientLabels = {
  calories: 'Năng lượng (kcal)',
  protein_g: 'Protein (g)',
  carbs_g: 'Carbohydrate (g)',
  fat_g: 'Chất béo (g)',
  sugar_g: 'Đường (g)',
  fiber_g: 'Chất xơ (g)',
  sodium_mg: 'Natri (mg)',
} as const;
export const nutrientFields = Object.keys(
  nutrientLabels,
) as (keyof typeof nutrientLabels)[];
const nullableNumber = z.number().nullable();
export const productDataSchema = z.object({
  name: z.string(),
  serving_size: nullableNumber,
  serving_unit: z.string().nullable(),
  nutrition_complete: z.boolean(),
  allergens_verified: z.boolean(),
  nutrition: z
    .object({
      calories: nullableNumber,
      protein_g: nullableNumber,
      carbs_g: nullableNumber,
      fat_g: nullableNumber,
      sugar_g: nullableNumber,
      fiber_g: nullableNumber,
      sodium_mg: nullableNumber,
      source: z.string(),
    })
    .nullable(),
  allergens: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      kind: z.enum(['contains', 'may_contain']),
    }),
  ),
  available_allergens: z.array(
    z.object({ code: z.string(), name: z.string() }),
  ),
});
export type ProductData = z.infer<typeof productDataSchema>;
export function nutritionPayload(data: FormData) {
  const optionalNumber = (name: string) => {
    const value = String(data.get(name) ?? '').trim();
    return value === '' ? null : Number(value);
  };
  return {
    serving_size: optionalNumber('serving_size'),
    serving_unit: data.get('serving_unit') || null,
    source: String(data.get('source') ?? '').trim(),
    ...Object.fromEntries(
      nutrientFields.map((field) => [field, optionalNumber(field)]),
    ),
  };
}
