import { expect, it } from 'vitest';
import { filtersSchema, productQuery } from './filters';

it('omits blank filters while preserving explicit zero thresholds', () => {
  const filters = filtersSchema.parse({
    categoryId: '',
    maxCalories: '0',
    minProtein: '',
  });
  expect(productQuery(filters)).toBe('page=0&size=8&maxCalories=0');
});

it.each([
  { maxCalories: '-1' },
  { minProtein: 'abc' },
  { categoryId: '0' },
  { page: '1.5' },
])('rejects invalid filter %j', (values) => {
  expect(filtersSchema.safeParse(values).success).toBe(false);
});
