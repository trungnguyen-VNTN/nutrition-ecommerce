import { z } from 'zod';

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
  categoryId: optionalNumber(true),
  maxCalories: optionalNumber(false),
  minProtein: optionalNumber(false),
});
export type ProductFilters = z.infer<typeof filtersSchema>;
export function productQuery(filters: ProductFilters) {
  const params = new URLSearchParams({ page: String(filters.page), size: '8' });
  for (const field of ['categoryId', 'maxCalories', 'minProtein'] as const) {
    if (filters[field] !== undefined) params.set(field, String(filters[field]));
  }
  return params.toString();
}
