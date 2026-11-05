import { z } from 'zod';
import { requestJson } from '@/lib/api/client';

export const adminProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  currency: z.string(),
  stock: z.number(),
  category_id: z.number().nullable(),
  active: z.boolean(),
});
export const adminOrderSchema = z.object({
  id: z.number(),
  status: z.enum(['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  total: z.number(),
  currency: z.string(),
});
export type AdminProduct = z.infer<typeof adminProductSchema>;

export const adminPageSize = 20;

export function adminRequest({
  path,
  method,
  body,
}: {
  path: string;
  method: string;
  body?: object;
}) {
  return requestJson(path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
}
