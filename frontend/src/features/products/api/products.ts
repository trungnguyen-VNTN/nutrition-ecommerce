import { z } from 'zod';
import type { Product, ProductPage } from '@/lib/api/catalog.types';
import { getJson } from '@/lib/api/client';
import { productQuery, type ProductFilters } from './filters';
const nonnegative = z.number().finite().nonnegative();
const categorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
});
export const productSchema = z
  .object({
    id: z
      .union([z.string().min(1), z.number().int().positive()])
      .transform(String),
    name: z.string().min(1),
    price: nonnegative,
    currency: z.string().regex(/^[A-Z]{3}$/),
    stock: z.number().int().nonnegative(),
    nutrition_complete: z.boolean(),
    allergens_verified: z.boolean(),
    description: z.string().nullable(),
    category: categorySchema.nullable(),
    serving_size: nonnegative.nullable(),
    serving_unit: z.string().nullable(),
    nutrition: z
      .object({
        calories: nonnegative,
        protein_g: nonnegative,
        carbs_g: nonnegative,
        fat_g: nonnegative,
        sugar_g: nonnegative.nullable(),
        fiber_g: nonnegative.nullable(),
        sodium_mg: nonnegative.nullable(),
        source: z.string(),
      })
      .nullable(),
    allergens: z
      .array(
        z.object({
          code: z.string(),
          name: z.string(),
          kind: z.enum(['contains', 'may_contain']),
        }),
      )
      .nullable(),
  })
  .refine(
    (p) =>
      !p.nutrition_complete ||
      (p.nutrition !== null &&
        p.serving_size !== null &&
        p.serving_unit !== null),
  )
  .refine((p) => !p.allergens_verified || p.allergens !== null);
const pageSchema = z.object({
  items: z.array(productSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export async function getProducts(
  filters: ProductFilters,
  signal?: AbortSignal,
): Promise<ProductPage> {
  return pageSchema.parse(
    await getJson('products?' + productQuery(filters), signal),
  );
}
export async function getProduct(
  id: string,
  signal?: AbortSignal,
): Promise<Product> {
  return productSchema.parse(
    await getJson('products/' + encodeURIComponent(id), signal),
  );
}
export async function getCategories(signal?: AbortSignal) {
  return z.array(categorySchema).parse(await getJson('categories', signal));
}
