import { ArrowRight, ShoppingCartSimple, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ProductArt } from '@/components/product-art';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Qty } from '@/components/ui/qty';
import { useToast } from '@/components/ui/toast-context';
import { controlClass } from '@/components/ui/field';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';
import { apiErrorMessage } from '@/lib/api/client';
import { SignInRequired } from '@/features/auth/auth-page';
import { useSession } from '@/features/auth/session';
import { changeCart, getCart } from './api';

export function CartPage() {
  const identity = useSession();
  const cache = useQueryClient();
  const toast = useToast();
  const key = ['cart', identity?.sub];
  const cart = useQuery({
    queryKey: key,
    queryFn: getCart,
    enabled: !!identity,
    retry: false,
  });
  const change = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number | null }) =>
      changeCart(id, quantity),
    onSuccess: (data, { quantity }) => {
      cache.setQueryData(key, data);
      if (quantity === null) toast('Đã xóa sản phẩm khỏi giỏ.');
    },
  });
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="eyebrow">Mua sắm có chọn lọc</p>
          <h1 className="text-4xl font-extrabold">Giỏ hàng</h1>
          <p className="text-ink-muted">
            Những lựa chọn dành cho bữa ăn của bạn.
          </p>
        </div>
        <Link
          className="inline-flex min-h-touch items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4"
          to="/products"
        >
          Tiếp tục mua sắm <ArrowRight />
        </Link>
      </header>
      {!identity ? (
        <SignInRequired />
      ) : cart.isPending ? (
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-card" />
            <Skeleton className="h-28 rounded-card" />
          </div>
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
          icon={<ShoppingCartSimple />}
          title="Giỏ hàng trống."
          description="Khám phá thực phẩm và xem dữ liệu dinh dưỡng trước khi chọn."
          action={
            <Button asChild>
              <Link to="/products">Chọn sản phẩm</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_340px]">
          <ul className="space-y-3">
            {cart.data.items.map((item, index) => (
              <li key={item.product_id}>
                <Card className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-4 gap-y-3 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
                  <ProductArt
                    name={item.name}
                    index={index}
                    imageUrl={item.image_url}
                    caption={false}
                    className="aspect-square rounded-control"
                  />
                  <div className="min-w-0 space-y-1">
                    <Link
                      to={`/products/${item.product_id}`}
                      className="font-display text-lg font-bold text-ink underline-offset-4 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-ink-muted tabular-nums">
                      {formatMoney(item.price, item.currency)} / sản phẩm
                    </p>
                    {(!item.active || item.stock < item.quantity) && (
                      <p
                        role="alert"
                        className="text-sm font-medium text-danger"
                      >
                        Sản phẩm không đủ hàng hoặc đã ngừng bán.
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end">
                    <Qty
                      value={item.quantity}
                      max={Math.min(item.stock, 99)}
                      label={item.name}
                      disabled={change.isPending}
                      onChange={(quantity) =>
                        change.mutate({ id: item.product_id, quantity })
                      }
                    />
                    <Button
                      variant="ghost"
                      disabled={change.isPending}
                      aria-label={`Xóa ${item.name}`}
                      onClick={() =>
                        change.mutate({ id: item.product_id, quantity: null })
                      }
                    >
                      <Trash />
                      Xóa
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Card as="aside" className="space-y-4 md:sticky md:top-32">
            <h2 className="text-xl font-bold">Tóm tắt giỏ hàng</h2>
            <div className="flex justify-between gap-4 text-sm">
              <span>Số sản phẩm</span>
              <span className="font-semibold tabular-nums">
                {cart.data.items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <span>Tạm tính</span>
              <strong className="font-display text-2xl font-extrabold tabular-nums">
                {formatMoney(cart.data.total, cart.data.items[0]!.currency)}
              </strong>
            </div>
            <Button className="w-full" asChild variant="sticker">
              <Link to="/checkout">Tiếp tục đặt hàng</Link>
            </Button>
            <p className="text-sm text-ink-muted">
              Giá và tồn kho được kiểm tra lại khi đặt hàng. Chưa có thanh toán
              trực tuyến.
            </p>
          </Card>
        </div>
      )}
      {change.isError && (
        <p
          className="rounded-control border border-danger bg-danger-tint p-4 text-danger"
          role="alert"
        >
          {apiErrorMessage(change.error)}
        </p>
      )}
    </section>
  );
}

export function AddToCart({ id, stock }: { id: string; stock: number }) {
  const identity = useSession();
  const cache = useQueryClient();
  const [quantity, setQuantity] = useState('1');
  const maximum = Math.min(stock, 99);
  const amount = Number(quantity);
  const valid = Number.isInteger(amount) && amount >= 1 && amount <= maximum;
  const mutation = useMutation({
    mutationFn: (selected: number) => changeCart(id, selected, true),
    onSuccess: (data) => cache.setQueryData(['cart', identity?.sub], data),
  });
  if (!identity)
    return (
      <Button asChild variant="sticker">
        <Link to="/login">Đăng nhập để thêm vào giỏ</Link>
      </Button>
    );
  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && !mutation.isPending) mutation.mutate(amount);
        }}
      >
        <label className="block text-sm font-semibold">
          Số lượng
          <input
            className={`${controlClass} w-24 tabular-nums`}
            type="number"
            min={1}
            max={maximum}
            step={1}
            required
            value={quantity}
            disabled={stock < 1 || mutation.isPending}
            onChange={(event) => {
              setQuantity(event.target.value);
              mutation.reset();
            }}
          />
        </label>
        <Button
          type="submit"
          variant="sticker"
          disabled={!valid}
          loading={mutation.isPending}
        >
          Thêm vào giỏ
        </Button>
      </form>
      {mutation.isSuccess && (
        <p
          className="rounded-control bg-lime-soft p-4 text-sm text-ink"
          role="status"
        >
          Đã thêm vào giỏ.{' '}
          <Link to="/cart" className="underline">
            Xem giỏ hàng
          </Link>
        </p>
      )}
      {mutation.isError && (
        <p role="alert">{apiErrorMessage(mutation.error)}</p>
      )}
    </div>
  );
}
