import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage, requestJson } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { useSession } from '@/features/auth/session';
import { SignInRequired } from '@/features/auth/auth-page';
import { getCart, orderSchema } from './api';

export function CheckoutPage() {
  const identity = useSession();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const key = useRef(crypto.randomUUID());
  const cart = useQuery({
    queryKey: ['cart', identity?.sub],
    queryFn: getCart,
    enabled: !!identity,
    retry: false,
  });
  const submit = useMutation({
    mutationFn: async (body: Record<string, FormDataEntryValue>) =>
      orderSchema.parse(
        await requestJson('orders', {
          method: 'POST',
          headers: { 'Idempotency-Key': key.current },
          body: JSON.stringify(body),
        }),
      ),
    onSuccess: async (order) => {
      await cache.invalidateQueries({ queryKey: ['cart'] });
      await cache.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/orders/${order.id}`);
    },
  });
  const input =
    'mt-2 block min-h-touch w-full rounded-control border border-neutral-200 bg-neutral-50 px-3';
  return (
    <section className="space-y-6">
      <header className="space-y-3 border-b border-neutral-200 pb-6">
        <Link
          to="/cart"
          className="inline-flex min-h-touch items-center text-sm text-primary-700 underline"
        >
          ← Quay lại giỏ hàng
        </Link>
        <h1 className="text-3xl font-semibold">Đặt hàng</h1>
        <p className="text-neutral-700">
          Kiểm tra lựa chọn và cho chúng tôi biết nơi nhận hàng.
        </p>
      </header>
      {!identity ? (
        <SignInRequired />
      ) : cart.isPending ? (
        <Skeleton className="h-16" />
      ) : cart.isError ? (
        <ErrorState
          description={apiErrorMessage(cart.error)}
          onRetry={() => void cart.refetch()}
        />
      ) : cart.data.items.length === 0 ? (
        <p>
          Giỏ hàng đang trống.{' '}
          <Link to="/products" className="underline">
            Chọn sản phẩm
          </Link>
        </p>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-3">
          <form
            className="space-y-6 lg:col-span-2"
            onSubmit={(event) => {
              event.preventDefault();
              submit.mutate(
                Object.fromEntries(new FormData(event.currentTarget)),
              );
            }}
          >
            <h2 className="text-xl font-semibold">Thông tin nhận hàng</h2>
            <label className="block">
              Người nhận
              <input
                className={input}
                name="shipping_name"
                autoComplete="name"
                required
                maxLength={120}
              />
            </label>
            <label className="block">
              Số điện thoại
              <input
                className={input}
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                maxLength={30}
              />
            </label>
            <label className="block">
              Địa chỉ
              <textarea
                className={input}
                rows={3}
                name="address"
                autoComplete="street-address"
                required
                maxLength={500}
              />
            </label>
            <Button type="submit" loading={submit.isPending}>
              Xác nhận đặt hàng
            </Button>
          </form>
          <aside className="space-y-6 rounded-card bg-primary-50 p-6">
            <h2 className="text-xl font-semibold">Đơn hàng của bạn</h2>
            <ul className="space-y-4">
              {cart.data.items.map((item) => (
                <li
                  className="flex justify-between gap-4 text-sm"
                  key={item.product_id}
                >
                  <span>
                    {item.name}
                    <span className="mt-1 block text-neutral-700">
                      Số lượng: {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatMoney(item.price * item.quantity, item.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap justify-between gap-2 border-t border-neutral-200 pt-4">
              <span>Tạm tính</span>
              <strong className="text-xl tabular-nums">
                {formatMoney(cart.data.total, cart.data.items[0]!.currency)}
              </strong>
            </div>
            <p className="text-sm text-neutral-700">
              Không thanh toán trực tuyến. Giá và tồn kho được kiểm tra lại khi
              xác nhận đặt hàng.
            </p>
          </aside>
        </div>
      )}
      {submit.isError && (
        <p
          className="rounded-control border border-danger p-4 text-danger"
          role="alert"
        >
          {apiErrorMessage(submit.error)} Bạn có thể thử lại mà không tạo đơn
          trùng.
        </p>
      )}
    </section>
  );
}
