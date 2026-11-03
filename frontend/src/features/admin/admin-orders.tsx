import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage, requestJson } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { statusText } from '@/features/commerce/api';
import { adminOrderSchema, adminPageSize } from './admin-api';

const nextStatus = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
} as const;

export function AdminOrders() {
  const [page, setPage] = useState(0);
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: async () =>
      z
        .array(adminOrderSchema)
        .parse(await requestJson(`admin/orders?page=${page}`)),
    retry: false,
  });
  const change = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      requestJson(`admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['admin-orders'] }),
  });
  return (
    <section id="admin-orders" className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Đơn hàng</h2>
        <p className="text-sm text-neutral-700">
          Mở chi tiết để kiểm tra sản phẩm và thông tin nhận hàng trước khi cập
          nhật trạng thái.
        </p>
      </div>
      {query.isPending ? (
        <Skeleton className="h-16" />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.data.length === 0 && <p>Chưa có đơn hàng.</p>}
          <ul className="space-y-4">
            {query.data.map((order) => (
              <li
                key={order.id}
                className="space-y-3 rounded-card border border-neutral-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="text-primary-700 underline"
                  >
                    Đơn #{order.id}
                  </Link>
                  <span className="rounded-pill bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700">
                    {statusText[order.status]}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(order.total, order.currency)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {nextStatus[order.status].map((status) => (
                    <Button
                      key={status}
                      variant="secondary"
                      disabled={change.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Chuyển đơn #${order.id} sang “${statusText[status]}”?`,
                          )
                        )
                          change.mutate({ id: order.id, status });
                      }}
                    >
                      {statusText[status]}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
              Trang trước
            </Button>
            <Button
              disabled={query.data.length < adminPageSize}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </Button>
          </div>
        </>
      )}
      {change.isError && <p role="alert">{apiErrorMessage(change.error)}</p>}
      {change.isSuccess && (
        <p
          role="status"
          className="rounded-control bg-primary-50 p-4 text-primary-700"
        >
          Đã cập nhật trạng thái đơn hàng.
        </p>
      )}
    </section>
  );
}
