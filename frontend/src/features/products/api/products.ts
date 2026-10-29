import { z } from 'zod';
import type { ProductPage } from '@/lib/api/catalog.types';
import { getJson } from '@/lib/api/client';

const productPageSchema: z.ZodType<ProductPage> = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      price: z.number().finite().nonnegative(),
      currency: z.literal('VND'),
      stock: z.number().int().nonnegative(),
      nutrition_complete: z.boolean(),
      allergens_verified: z.boolean(),
    }),
  ),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export async function getProducts(signal?: AbortSignal): Promise<ProductPage> {
  return productPageSchema.parse(
    await getJson('products?page=0&size=8', signal),
  );
}
