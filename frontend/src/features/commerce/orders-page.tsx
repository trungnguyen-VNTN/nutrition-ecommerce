import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Receipt,
} from '@phosphor-icons/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSession } from '@/features/auth/session';
import { SignInRequired } from '@/features/auth/auth-page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast-context';
import { apiErrorMessage, requestJson } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { getOrder, getOrders } from './api';
import { OrderStatus } from './order-status';

const orderDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN');

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
      <header className="space-y-3">
        <p className="eyebrow">Tài khoản của bạn</p>
        <h1 className="text-4xl font-extrabold">Đơn hàng</h1>
        <p className="text-ink-muted">
          Xem lại lựa chọn và theo dõi trạng thái từng đơn mua.
        </p>
      </header>
      {!identity ? (
        <SignInRequired />
      ) : query.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
        </div>
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.data.length === 0 ? (
            <EmptyState
              icon={<Receipt />}
              title="Chưa có đơn hàng trên trang này."
              description="Các đơn mua của bạn sẽ xuất hiện tại đây."
              action={
                <Button asChild>
                  <Link to="/products">Khám phá sản phẩm</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {query.data.map((order) => (
                <li key={order.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <div>
                      <Link
                        className="inline-flex min-h-touch items-center font-display text-xl font-bold text-ink underline underline-offset-4"
                        to={`/orders/${order.id}`}
                      >
                        Đơn #{order.id}
                      </Link>
                      <p className="text-sm text-ink-muted">
                        {orderDate(order.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <OrderStatus status={order.status} />
                      <p className="font-display text-xl font-extrabold tabular-nums">
                        {formatMoney(order.total, order.currency)}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Trang trước
            </Button>
            <span className="text-sm text-ink-muted" aria-live="polite">
              Trang {page + 1}
            </span>
            <Button
              variant="outline"
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

// Shown once, right after checkout redirects here (no separate success route, D12).
function PlacedNotice({ id }: { id: number }) {
  return (
    <section
      role="status"
      className="flex flex-wrap items-center justify-between gap-4 rounded-sheet bg-lime p-6"
    >
      <div className="flex items-center gap-4">
        <CheckCircle weight="fill" className="icon text-4xl text-brand" />
        <div>
          <h2 className="text-2xl font-extrabold">Đặt hàng thành công!</h2>
          <p>Mã đơn hàng của bạn là #{id}.</p>
        </div>
      </div>
      <Button asChild variant="outline">
        <Link to="/products">
          Tiếp tục mua sắm <ArrowRight />
        </Link>
      </Button>
    </section>
  );
}

export function OrderDetailPage({ admin = false }: { admin?: boolean }) {
  const { id = '' } = useParams();
  const { state } = useLocation();
  const identity = useSession();
  const cache = useQueryClient();
  const toast = useToast();
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
      toast('Đã hủy đơn hàng.');
    },
  });
  const justPlaced = (state as { justPlaced?: boolean } | null)?.justPlaced;
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <Link
          className="inline-flex min-h-touch items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4"
          to={admin ? '/admin' : '/orders'}
        >
          <ArrowLeft /> {admin ? 'Quản trị' : 'Tất cả đơn hàng'}
        </Link>
        <h1 className="text-4xl font-extrabold">Chi tiết đơn hàng</h1>
      </header>
      {!identity ? (
        <SignInRequired />
      ) : admin && !identity.admin ? (
        <p role="alert">Bạn không có quyền quản trị.</p>
      ) : query.isPending ? (
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {justPlaced && !admin && <PlacedNotice id={query.data.id} />}
          <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Đơn #{query.data.id}</h2>
                  <p className="text-sm text-ink-muted">
                    Ngày đặt: {orderDate(query.data.created_at)}
                  </p>
                </div>
                <OrderStatus status={query.data.status} />
              </div>
              <h3 className="border-t border-line pt-4 font-bold">
                Sản phẩm đã đặt
              </h3>
              <ul className="divide-y divide-line">
                {query.data.items.map((item) => (
                  <li
                    className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3"
                    key={item.product_id}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{item.name_snapshot}</p>
                      <p className="text-sm text-ink-muted">
                        Số lượng: {item.quantity} ·{' '}
                        {formatMoney(item.unit_price, query.data.currency)} /
                        sản phẩm
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatMoney(
                        item.unit_price * item.quantity,
                        query.data.currency,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="flex items-center justify-between gap-4 border-t-2 border-ink pt-4">
                <span className="font-semibold">Tổng</span>
                <strong className="font-display text-2xl font-extrabold tabular-nums">
                  {formatMoney(query.data.total, query.data.currency)}
                </strong>
              </p>
            </Card>
            <Card as="aside" className="space-y-3">
              <h2 className="text-xl font-bold">Thông tin nhận hàng</h2>
              <p className="font-semibold">{query.data.shipping_name}</p>
              <p className="text-sm text-ink-muted">{query.data.phone}</p>
              <p className="text-sm wrap-anywhere text-ink-muted">
                {query.data.address}
              </p>
              <p className="border-t border-line pt-3 text-xs text-ink-muted">
                Đơn hàng này không có thanh toán trực tuyến.
              </p>
            </Card>
          </div>
          {!admin && query.data.status === 'PLACED' && (
            <div className="border-t border-line pt-6">
              <Button
                variant="destructive"
                loading={cancel.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Hủy đơn #${query.data.id}? Thao tác này không hoàn tác được.`,
                    )
                  )
                    cancel.mutate();
                }}
              >
                Hủy đơn hàng
              </Button>
            </div>
          )}
        </>
      )}
      {cancel.isError && (
        <p
          className="rounded-control border border-danger bg-danger-tint p-4 text-danger"
          role="alert"
        >
          {apiErrorMessage(cancel.error)}
        </p>
      )}
    </section>
  );
}
