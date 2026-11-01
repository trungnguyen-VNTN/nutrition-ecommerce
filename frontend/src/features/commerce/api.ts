import { z } from 'zod';
import { requestJson } from '@/lib/api/client';

const itemSchema = z.object({
  product_id: z.number(),
  name: z.string(),
  price: z.number(),
  currency: z.string(),
  quantity: z.number(),
  stock: z.number(),
  active: z.boolean(),
});
export const cartSchema = z.object({
  items: z.array(itemSchema),
  total: z.number(),
});
const summarySchema = z.object({
  id: z.number(),
  status: z.enum(['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  total: z.number(),
  currency: z.string(),
  created_at: z.string(),
});
export const orderSchema = summarySchema.extend({
  shipping_name: z.string(),
  phone: z.string(),
  address: z.string(),
  items: z.array(
    z.object({
      product_id: z.number(),
      name_snapshot: z.string(),
      unit_price: z.number(),
      quantity: z.number(),
    }),
  ),
});
export const getCart = async () => cartSchema.parse(await requestJson('cart'));
export const getOrders = async (page: number) =>
  z
    .array(summarySchema)
    .parse(await requestJson(`orders?page=${page}&size=20`));
export const getOrder = async (id: string, admin = false) =>
  orderSchema.parse(
    await requestJson(
      `${admin ? 'admin/' : ''}orders/${encodeURIComponent(id)}`,
    ),
  );
export const changeCart = async (
  id: string | number,
  quantity: number | null,
  add = false,
) =>
  cartSchema.parse(
    await requestJson(add ? 'cart/items' : `cart/items/${id}`, {
      method: add ? 'POST' : quantity === null ? 'DELETE' : 'PATCH',
      body:
        quantity === null
          ? undefined
          : JSON.stringify(
              add ? { product_id: Number(id), quantity } : { quantity },
            ),
    }),
  );
export const statusText = {
  PLACED: 'Đã đặt',
  CONFIRMED: 'Đã xác nhận',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};
