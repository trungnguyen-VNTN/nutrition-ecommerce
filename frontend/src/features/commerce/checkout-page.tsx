import { useRef, type ReactNode } from 'react';
import { ArrowLeft, Money } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage, requestJson } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { useSession } from '@/features/auth/session';
import { SignInRequired } from '@/features/auth/auth-page';
import { getCart, orderSchema } from './api';

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card as="section" className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-pill bg-lime text-sm font-bold"
        >
          {number}
        </span>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

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
      navigate(`/orders/${order.id}`, { state: { justPlaced: true } });
    },
  });
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <Link
          to="/cart"
          className="inline-flex min-h-touch items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4"
        >
          <ArrowLeft /> Quay lại giỏ hàng
        </Link>
        <h1 className="text-4xl font-extrabold">Đặt hàng</h1>
        <p className="text-ink-muted">
          Kiểm tra lựa chọn và cho chúng tôi biết nơi nhận hàng.
        </p>
      </header>
      {!identity ? (
        <SignInRequired />
      ) : cart.isPending ? (
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-96 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      ) : cart.isError ? (
        <ErrorState
          description={apiErrorMessage(cart.error)}
          error={cart.error}
          onRetry={() => void cart.refetch()}
        />
      ) : cart.data.items.length === 0 ? (
        <EmptyState
          title="Giỏ hàng đang trống"
          description="Chọn sản phẩm trước khi đặt hàng."
          action={
            <Button asChild>
              <Link to="/products">Chọn sản phẩm</Link>
            </Button>
          }
        />
      ) : (
        <form
          className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_340px]"
          onSubmit={(event) => {
            event.preventDefault();
            submit.mutate(
              Object.fromEntries(new FormData(event.currentTarget)),
            );
          }}
        >
          <div className="space-y-4">
            <Step number="1" title="Thông tin nhận hàng">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Người nhận" required>
                  {(control) => (
                    <Input
                      {...control}
                      name="shipping_name"
                      autoComplete="name"
                      maxLength={120}
                    />
                  )}
                </Field>
                <Field label="Số điện thoại" required>
                  {(control) => (
                    <Input
                      {...control}
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={30}
                    />
                  )}
                </Field>
                <Field label="Địa chỉ" required className="sm:col-span-2">
                  {(control) => (
                    <Textarea
                      {...control}
                      rows={3}
                      name="address"
                      autoComplete="street-address"
                      maxLength={500}
                    />
                  )}
                </Field>
              </div>
            </Step>
            <Step number="2" title="Thanh toán">
              <p className="flex items-start gap-3 rounded-control border border-line bg-sunken p-3 text-sm">
                <Money className="icon mt-0.5 text-xl" />
                <span>
                  <strong className="block">Thanh toán khi nhận hàng</strong>
                  Cửa hàng chưa có thanh toán trực tuyến.
                </span>
              </p>
            </Step>
          </div>
          <Card as="aside" className="space-y-4 md:sticky md:top-32">
            <h2 className="text-xl font-bold">Đơn hàng của bạn</h2>
            <ul className="space-y-3">
              {cart.data.items.map((item) => (
                <li
                  className="flex justify-between gap-4 text-sm"
                  key={item.product_id}
                >
                  <span className="min-w-0">
                    {item.name}
                    <span className="mt-1 block text-ink-muted">
                      Số lượng: {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatMoney(item.price * item.quantity, item.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <span>Tạm tính</span>
              <strong className="font-display text-2xl font-extrabold tabular-nums">
                {formatMoney(cart.data.total, cart.data.items[0]!.currency)}
              </strong>
            </div>
            <Button
              className="w-full"
              type="submit"
              variant="sticker"
              loading={submit.isPending}
            >
              Xác nhận đặt hàng
            </Button>
            <p className="text-sm text-ink-muted">
              Giá và tồn kho được kiểm tra lại khi xác nhận đặt hàng.
            </p>
          </Card>
        </form>
      )}
      {submit.isError && (
        <p
          className="rounded-control border border-danger bg-danger-tint p-4 text-danger"
          role="alert"
        >
          {apiErrorMessage(submit.error)} Bạn có thể thử lại mà không tạo đơn
          trùng.
        </p>
      )}
    </section>
  );
}
