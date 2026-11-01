import { expect, it } from 'vitest';
import { filtersSchema, productQuery } from './filters';

it('keeps multiple allergen exclusions when changing pages', () => {
  const filters = filtersSchema.parse({
    page: 2,
    excludeAllergen: ['peanut', 'milk'],
  });
  expect(
    new URLSearchParams(productQuery(filters)).getAll('excludeAllergen'),
  ).toEqual(['peanut', 'milk']);
  expect(
    filtersSchema.safeParse({ excludeAllergen: ['unknown'] }).success,
  ).toBe(false);
});

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
