import { z } from 'zod';

export const allergenOptions = [
  { code: 'peanut', label: 'Đậu phộng' },
  { code: 'milk', label: 'Sữa' },
  { code: 'egg', label: 'Trứng' },
  { code: 'soy', label: 'Đậu nành' },
  { code: 'gluten', label: 'Gluten' },
  { code: 'shellfish', label: 'Hải sản có vỏ' },
] as const;

const optionalNumber = (positive: boolean) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    (positive
      ? z.coerce.number().int().positive()
      : z.coerce.number().finite().nonnegative()
    ).optional(),
  );
export const filtersSchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  q: z.string().trim().max(100).optional(),
  categoryId: optionalNumber(true),
  maxCalories: optionalNumber(false),
  minProtein: optionalNumber(false),
  excludeAllergen: z
    .array(z.enum(['peanut', 'milk', 'egg', 'soy', 'gluten', 'shellfish']))
    .max(6)
    .optional(),
});
export type ProductFilters = z.infer<typeof filtersSchema>;
export function productQuery(filters: ProductFilters) {
  const params = new URLSearchParams({ page: String(filters.page), size: '8' });
  for (const field of [
    'q',
    'categoryId',
    'maxCalories',
    'minProtein',
  ] as const) {
    if (filters[field] !== undefined) params.set(field, String(filters[field]));
  }
  for (const code of filters.excludeAllergen ?? [])
    params.append('excludeAllergen', code);
  return params.toString();
}
