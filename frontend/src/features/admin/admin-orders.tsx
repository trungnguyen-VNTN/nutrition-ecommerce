import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt } from '@phosphor-icons/react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Note } from '@/components/ui/note';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage, requestJson } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { statusText } from '@/features/commerce/api';
import { OrderStatus } from '@/features/commerce/order-status';
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
    <section id="admin-orders" className="scroll-mt-40 space-y-4">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Đơn hàng</h2>
        <p className="text-sm text-ink-muted">
          Mở chi tiết để kiểm tra sản phẩm và thông tin nhận hàng trước khi cập
          nhật trạng thái.
        </p>
      </div>
      {change.isError && (
        <Note tone="error" role="alert">
          {apiErrorMessage(change.error)}
        </Note>
      )}
      {change.isSuccess && (
        <Note tone="success" role="status">
          Đã cập nhật trạng thái đơn hàng.
        </Note>
      )}
      {query.isPending ? (
        <Skeleton className="h-48 rounded-card" />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={<Receipt />}
          title="Chưa có đơn hàng."
          description="Đơn mới của khách sẽ xuất hiện tại đây."
        />
      ) : (
        <>
          <div
            className="overflow-x-auto rounded-card border border-line bg-surface"
            role="region"
            aria-label="Bảng đơn hàng"
            tabIndex={0}
          >
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-sunken text-left text-xs text-ink-muted">
                <tr>
                  <th className="p-3 font-semibold">Mã đơn</th>
                  <th className="p-3 font-semibold">Trạng thái</th>
                  <th className="p-3 font-semibold">Tổng tiền</th>
                  <th className="p-3 text-right font-semibold">Chuyển sang</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((order) => (
                  <tr key={order.id} className="border-t border-line">
                    <td className="p-3">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="inline-flex min-h-touch items-center font-bold underline underline-offset-4"
                      >
                        Đơn #{order.id}
                      </Link>
                    </td>
                    <td className="p-3">
                      <OrderStatus status={order.status} />
                    </td>
                    <td className="p-3 font-semibold whitespace-nowrap tabular-nums">
                      {formatMoney(order.total, order.currency)}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {nextStatus[order.status].map((status) => (
                          <Button
                            key={status}
                            variant={
                              status === 'CANCELLED' ? 'ghost' : 'secondary'
                            }
                            className={
                              status === 'CANCELLED' ? 'text-danger' : ''
                            }
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Trang trước
            </Button>
            <Button
              variant="outline"
              disabled={query.data.length < adminPageSize}
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
