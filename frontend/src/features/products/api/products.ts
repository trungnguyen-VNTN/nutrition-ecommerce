import { z } from 'zod';
import type { Product, ProductPage } from '@/lib/api/catalog.types';
import { getJson } from '@/lib/api/client';
import { productQuery, type ProductQuery } from './filters';
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
    // True only when an admin confirmed the list; seed and demo data are never "verified".
    allergens_reviewed: z.boolean().default(false),
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
    // Product photos (D21). Only same-origin paths are accepted so API data can never
    // point an <img> at another site or a javascript: URL.
    images: z
      .array(
        z.object({
          id: z.number().int().positive(),
          url: z.string().regex(/^\/(?!\/)[^\s]*$/),
        }),
      )
      .optional(),
  })
  .refine(
    (p) =>
      !p.nutrition_complete ||
      (p.nutrition !== null &&
        p.serving_size !== null &&
        p.serving_unit !== null),
  )
  .refine((p) => !p.allergens_verified || p.allergens !== null)
  .refine((p) => p.allergens_verified || !p.allergens_reviewed);
const pageSchema = z.object({
  items: z.array(productSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export async function getProducts(
  filters: ProductQuery,
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
