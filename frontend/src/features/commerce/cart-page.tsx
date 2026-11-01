import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
    onSuccess: (data) => cache.setQueryData(key, data),
  });
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary-700">
            Mua sắm có chọn lọc
          </p>
          <h1 className="text-3xl font-semibold">Giỏ hàng</h1>
          <p className="text-neutral-700">
            Những lựa chọn dành cho bữa ăn của bạn.
          </p>
        </div>
        <Link
          className="inline-flex min-h-touch items-center text-sm font-semibold text-primary-700 underline"
          to="/products"
        >
          Tiếp tục mua sắm →
        </Link>
      </header>
      {!identity ? (
        <SignInRequired />
      ) : cart.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : cart.isError ? (
        <ErrorState
          description={apiErrorMessage(cart.error)}
          onRetry={() => void cart.refetch()}
        />
      ) : cart.data.items.length === 0 ? (
        <div className="space-y-4 rounded-card bg-primary-50 p-8 text-center">
          <span className="text-3xl text-primary-700" aria-hidden="true">
            ◇
          </span>
          <h2 className="text-xl font-semibold">Giỏ hàng trống.</h2>
          <p className="text-neutral-700">
            Khám phá thực phẩm và xem dữ liệu dinh dưỡng trước khi chọn.
          </p>
          <Button asChild>
            <Link to="/products">Chọn sản phẩm</Link>
          </Button>
        </div>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-3">
          <ul className="space-y-4 lg:col-span-2">
            {cart.data.items.map((item) => (
              <li
                key={item.product_id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 py-6"
              >
                <div className="min-w-0 space-y-2">
                  <Link
                    to={`/products/${item.product_id}`}
                    className="text-lg font-semibold text-primary-700 hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-neutral-700">
                    {formatMoney(item.price, item.currency)} / sản phẩm
                  </p>
                  {(!item.active || item.stock < item.quantity) && (
                    <p role="alert" className="text-danger">
                      Sản phẩm không đủ hàng hoặc đã ngừng bán.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    aria-label={`Giảm ${item.name}`}
                    disabled={change.isPending || item.quantity <= 1}
                    onClick={() =>
                      change.mutate({
                        id: item.product_id,
                        quantity: item.quantity - 1,
                      })
                    }
                  >
                    −
                  </Button>
                  <span
                    className="min-w-touch text-center font-semibold tabular-nums"
                    aria-label={`Số lượng ${item.name}`}
                  >
                    {item.quantity}
                  </span>
                  <Button
                    variant="secondary"
                    aria-label={`Tăng ${item.name}`}
                    disabled={
                      change.isPending ||
                      item.quantity >= Math.min(item.stock, 99)
                    }
                    onClick={() =>
                      change.mutate({
                        id: item.product_id,
                        quantity: item.quantity + 1,
                      })
                    }
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={change.isPending}
                    onClick={() =>
                      change.mutate({ id: item.product_id, quantity: null })
                    }
                  >
                    Xóa
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <aside className="space-y-6 rounded-card bg-primary-50 p-6">
            <h2 className="text-xl font-semibold">Tóm tắt giỏ hàng</h2>
            <div className="flex justify-between gap-4 text-sm">
              <span>Số sản phẩm</span>
              <span className="font-semibold tabular-nums">
                {cart.data.items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-4">
              <span>Tạm tính</span>
              <strong className="text-2xl tabular-nums">
                {formatMoney(cart.data.total, cart.data.items[0]!.currency)}
              </strong>
            </div>
            <Button className="w-full" asChild>
              <Link to="/checkout">Tiếp tục đặt hàng</Link>
            </Button>
            <p className="text-sm text-neutral-700">
              Giá và tồn kho được kiểm tra lại khi đặt hàng. Chưa có thanh toán
              trực tuyến.
            </p>
          </aside>
        </div>
      )}
      {change.isError && (
        <p
          className="rounded-control border border-danger p-4 text-danger"
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
      <Button asChild>
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
        <label className="block text-sm font-medium">
          Số lượng
          <input
            className="mt-2 block min-h-touch rounded-control border border-neutral-200 bg-neutral-50 px-3 py-2 tabular-nums"
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
        <Button type="submit" disabled={!valid} loading={mutation.isPending}>
          Thêm vào giỏ
        </Button>
      </form>
      {mutation.isSuccess && (
        <p
          className="rounded-control bg-primary-50 p-4 text-sm text-primary-700"
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
