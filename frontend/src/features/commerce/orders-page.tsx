import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useSession } from '@/features/auth/session';
import { SignInRequired } from '@/features/auth/auth-page';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage, requestJson } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { getOrder, getOrders, statusText } from './api';

export function OrdersPage() {
  const identity = useSession();
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ['orders', identity?.sub, page],
    queryFn: () => getOrders(page),
    enabled: !!identity,
    retry: false,
  });
  return (
    <section className="space-y-6">
      <header className="space-y-2 border-b border-neutral-200 pb-6">
        <p className="text-sm font-medium text-primary-700">
          Tài khoản của bạn
        </p>
        <h1 className="text-3xl font-semibold">Đơn hàng</h1>
        <p className="text-neutral-700">
          Xem lại lựa chọn và theo dõi trạng thái từng đơn mua.
        </p>
      </header>
      {!identity ? (
        <SignInRequired />
      ) : query.isPending ? (
        <Skeleton className="h-16" />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.data.length === 0 ? (
            <div className="space-y-4 rounded-card bg-primary-50 p-8 text-center">
              <h2 className="text-xl font-semibold">
                Chưa có đơn hàng trên trang này.
              </h2>
              <p className="text-neutral-700">
                Các đơn mua của bạn sẽ xuất hiện tại đây.
              </p>
              <Button asChild>
                <Link to="/products">Khám phá sản phẩm</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {query.data.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-neutral-200 p-6"
                >
                  <div className="space-y-2">
                    <Link
                      className="inline-flex min-h-touch items-center text-lg font-semibold text-primary-700 underline"
                      to={`/orders/${order.id}`}
                    >
                      Đơn #{order.id}
                    </Link>
                    <p className="text-sm text-neutral-700">
                      {new Date(order.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="rounded-pill bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700">
                      {statusText[order.status]}
                    </span>
                    <p className="text-xl font-semibold tabular-nums">
                      {formatMoney(order.total, order.currency)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Trang trước
            </Button>
            <span className="text-sm text-neutral-700" aria-live="polite">
              Trang {page + 1}
            </span>
            <Button
              variant="secondary"
              disabled={query.data.length < 20}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
export function OrderDetailPage({ admin = false }: { admin?: boolean }) {
  const { id = '' } = useParams();
  const identity = useSession();
  const cache = useQueryClient();
  const key = ['order', identity?.sub, id, admin];
  const query = useQuery({
    queryKey: key,
    queryFn: () => getOrder(id, admin),
    enabled: !!identity && (!admin || identity.admin),
    retry: false,
  });
  const cancel = useMutation({
    mutationFn: () => requestJson(`orders/${id}/cancel`, { method: 'POST' }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: key });
      await cache.invalidateQueries({ queryKey: ['orders'] });
    },
  });
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <Link
          className="inline-flex min-h-touch items-center text-sm text-primary-700 underline"
          to={admin ? '/admin' : '/orders'}
        >
          ← {admin ? 'Quản trị' : 'Tất cả đơn hàng'}
        </Link>
        <h1 className="text-3xl font-semibold">Chi tiết đơn hàng</h1>
      </header>
      {!identity ? (
        <SignInRequired />
      ) : admin && !identity.admin ? (
        <p role="alert">Bạn không có quyền quản trị.</p>
      ) : query.isPending ? (
        <Skeleton className="h-16" />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-primary-50 p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Đơn #{query.data.id}</h2>
              <p className="text-sm text-neutral-700">
                Ngày đặt:{' '}
                {new Date(query.data.created_at).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <span className="rounded-pill border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700">
              {statusText[query.data.status]}
            </span>
          </div>
          <div className="grid items-start gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <h2 className="text-xl font-semibold">Sản phẩm đã đặt</h2>
              <ul className="divide-y divide-neutral-200">
                {query.data.items.map((item) => (
                  <li
                    className="flex flex-wrap justify-between gap-4 py-4"
                    key={item.product_id}
                  >
                    <div className="space-y-2">
                      <p className="font-semibold">{item.name_snapshot}</p>
                      <p className="text-sm text-neutral-700">
                        Số lượng: {item.quantity} ·{' '}
                        {formatMoney(item.unit_price, query.data.currency)} /
                        sản phẩm
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">
                      {formatMoney(
                        item.unit_price * item.quantity,
                        query.data.currency,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="border-t border-neutral-200 pt-4 text-right text-xl font-semibold tabular-nums">
                Tổng: {formatMoney(query.data.total, query.data.currency)}
              </p>
            </div>
            <aside className="space-y-4 rounded-card border border-neutral-200 p-6">
              <h2 className="text-xl font-semibold">Thông tin nhận hàng</h2>
              <p className="font-semibold">{query.data.shipping_name}</p>
              <p className="text-sm text-neutral-700">{query.data.phone}</p>
              <p className="break-words text-sm text-neutral-700">
                {query.data.address}
              </p>
              <p className="border-t border-neutral-200 pt-4 text-xs text-neutral-700">
                Đơn hàng này không có thanh toán trực tuyến.
              </p>
            </aside>
          </div>
          {!admin && query.data.status === 'PLACED' && (
            <Button
              variant="destructive"
              loading={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              Hủy đơn hàng
            </Button>
          )}
        </>
      )}
      {cancel.isError && (
        <p
          className="rounded-control border border-danger p-4 text-danger"
          role="alert"
        >
          {apiErrorMessage(cancel.error)}
        </p>
      )}
    </section>
  );
}
