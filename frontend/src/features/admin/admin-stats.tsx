import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Warning } from '@phosphor-icons/react';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state';
import { apiErrorMessage, requestJson } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { statusText } from '@/features/commerce/api';

const count = z.number().int().nonnegative();
const statsSchema = z.object({
  orders: z.object({
    total: count,
    by_status: z.object({
      PLACED: count,
      CONFIRMED: count,
      SHIPPED: count,
      DELIVERED: count,
      CANCELLED: count,
    }),
    revenue: z.number().nonnegative(),
    currency: z.string(),
  }),
  recent_days: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        orders: count,
      }),
    )
    .length(7),
  catalog: z.object({
    active_products: count,
    out_of_stock: count,
    low_stock: count,
    missing_nutrition: count,
    allergens_unverified: count,
    allergens_sample: count,
  }),
  low_stock_items: z.array(
    z.object({ id: z.number(), name: z.string(), stock: count }),
  ),
  low_stock_threshold: count,
});
type Stats = z.infer<typeof statsSchema>;

const dayLabel = (iso: string) => {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
};

function Tile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="space-y-1">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="font-display text-3xl font-extrabold tabular-nums">
        {value}
      </dd>
      {detail && <dd className="text-xs text-ink-muted">{detail}</dd>}
    </Card>
  );
}

// Seven bars with the value printed on each, so nothing depends on hover or colour.
function RecentOrders({ days }: { days: Stats['recent_days'] }) {
  const max = Math.max(1, ...days.map((day) => day.orders));
  return (
    <Card className="space-y-4">
      <h3 className="font-bold">Đơn hàng 7 ngày gần nhất</h3>
      <ol className="flex h-40 items-end gap-2" aria-label="Số đơn theo ngày">
        {days.map((day) => (
          <li
            key={day.date}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-xs font-semibold tabular-nums">
              {day.orders}
            </span>
            <span
              aria-hidden="true"
              className="w-full max-w-10 rounded-t bg-brand"
              style={{
                height: `${(day.orders / max) * 100}%`,
                minHeight: day.orders > 0 ? 4 : 1,
              }}
            />
            <span className="text-xs text-ink-muted tabular-nums">
              <span className="sr-only">ngày </span>
              {dayLabel(day.date)}
              <span className="sr-only">: {day.orders} đơn</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function AdminStats() {
  const query = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => statsSchema.parse(await requestJson('admin/stats')),
    retry: false,
  });
  return (
    <section id="admin-stats" className="scroll-mt-40 space-y-4">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Tổng quan</h2>
        <p className="text-sm text-ink-muted">
          Số liệu tổng hợp, không hiển thị thông tin cá nhân của khách hàng.
          Chưa có thanh toán nên doanh thu là tổng giá trị đơn chưa hủy.
        </p>
      </div>
      {query.isPending ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          aria-busy="true"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <StatsBody stats={query.data} />
      )}
    </section>
  );
}

function StatsBody({ stats }: { stats: Stats }) {
  const { orders, catalog } = stats;
  const open = orders.by_status.PLACED + orders.by_status.CONFIRMED;
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Tổng đơn hàng"
          value={String(orders.total)}
          detail={`${open} đơn chờ xử lý · ${orders.by_status.CANCELLED} ${statusText.CANCELLED.toLowerCase()}`}
        />
        <Tile
          label="Doanh thu (đơn chưa hủy)"
          value={formatMoney(orders.revenue, orders.currency)}
        />
        <Tile
          label="Sản phẩm đang bán"
          value={String(catalog.active_products)}
          detail={`${catalog.out_of_stock} hết hàng · ${catalog.low_stock} sắp hết`}
        />
        <Tile
          label="Allergen cần xác nhận"
          value={String(
            catalog.allergens_sample + catalog.allergens_unverified,
          )}
          detail={`${catalog.allergens_sample} dữ liệu mẫu · ${catalog.missing_nutrition} thiếu dinh dưỡng`}
        />
      </dl>
      <div className="grid gap-3 lg:grid-cols-2">
        <RecentOrders days={stats.recent_days} />
        <Card className="space-y-3">
          <h3 className="font-bold">
            Tồn kho thấp (≤ {stats.low_stock_threshold})
          </h3>
          {stats.low_stock_items.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Không có sản phẩm nào sắp hết hàng.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {stats.low_stock_items.map((item) => (
                <li
                  key={item.id}
                  className="flex min-h-touch items-center justify-between gap-3"
                >
                  <Link
                    to={`/admin/products/${item.id}`}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {item.name}
                  </Link>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-danger tabular-nums">
                    <Warning aria-hidden="true" />
                    {item.stock === 0 ? 'Hết hàng' : `Còn ${item.stock}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
