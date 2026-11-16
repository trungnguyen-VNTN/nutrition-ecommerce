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
  // Primary product photo; absent or null means no photo yet.
  image_url: z.string().nullish(),
});
export const cartSchema = z.object({
  items: z.array(itemSchema),
  total: z.number(),
});
export const orderStatuses = [
  'AWAITING_PAYMENT',
  'PLACED',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatusCode = (typeof orderStatuses)[number];
// Payment fields (D27); older responses without them read as cash on delivery.
export const paymentFields = {
  payment_method: z.enum(['COD', 'VNPAY']).default('COD'),
  payment_status: z.enum(['UNPAID', 'PAID', 'REFUND_NEEDED']).default('UNPAID'),
};
const summarySchema = z.object({
  id: z.number(),
  status: z.enum(orderStatuses),
  total: z.number(),
  currency: z.string(),
  created_at: z.string(),
  ...paymentFields,
});
export const orderSchema = summarySchema.extend({
  payment_expires_at: z.string().nullish(),
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
export const statusText: Record<OrderStatusCode, string> = {
  AWAITING_PAYMENT: 'Chờ thanh toán',
  PLACED: 'Đã đặt',
  CONFIRMED: 'Đã xác nhận',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export const getPaymentMethods = async () =>
  z
    .array(z.enum(['COD', 'VNPAY']))
    .parse(await requestJson('payments/methods'));

/** Starts a VNPAY sandbox payment for the caller's order and returns the gateway URL. */
export const startVnpayPayment = async (orderId: number) => {
  const { payment_url } = z
    .object({ payment_url: z.string().url() })
    .parse(
      await requestJson(`orders/${orderId}/payments/vnpay`, { method: 'POST' }),
    );
  // Only ever leave the site for the VNPAY sandbox or production gateway.
  const target = new URL(payment_url);
  if (
    target.protocol !== 'https:' ||
    !(
      target.hostname === 'vnpayment.vn' ||
      target.hostname.endsWith('.vnpayment.vn')
    )
  )
    throw new Error('Unexpected payment URL');
  return payment_url;
};

export const vnpayReturnSchema = z.object({
  order_id: z.number(),
  gateway_code: z.string().nullable(),
  payment_status: z.enum(['UNPAID', 'PAID', 'REFUND_NEEDED']),
  order_status: z.enum(orderStatuses),
});
export const getVnpayReturn = async (search: string, signal?: AbortSignal) =>
  vnpayReturnSchema.parse(
    await requestJson(`payments/vnpay/return${search}`, { signal }),
  );
