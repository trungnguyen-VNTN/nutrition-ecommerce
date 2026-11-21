import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  ClockCounterClockwise,
  Prohibit,
  WarningCircle,
} from '@phosphor-icons/react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/field';
import { Tag } from '@/components/ui/tag';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage, requestJson } from '@/lib/api/client';
import { adminPageSize } from './admin-api';

const paymentOutcomes = [
  'PAID',
  'PAYMENT_FAILED',
  'REFUND_NEEDED',
  'DUPLICATE',
  'INVALID_SIGNATURE',
  'UNKNOWN_ORDER',
  'INVALID_AMOUNT',
  'DISABLED',
] as const;
type Outcome = (typeof paymentOutcomes)[number];

// Every label carries text; colour is never the only signal.
const outcomeView: Record<
  Outcome,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  PAID: { label: 'Đã thanh toán', tone: 'success' },
  PAYMENT_FAILED: { label: 'Thanh toán thất bại', tone: 'neutral' },
  REFUND_NEEDED: { label: 'Cần hoàn tiền', tone: 'warning' },
  DUPLICATE: { label: 'Gửi lặp lại', tone: 'neutral' },
  INVALID_SIGNATURE: { label: 'Sai chữ ký', tone: 'danger' },
  UNKNOWN_ORDER: { label: 'Không tìm thấy giao dịch', tone: 'danger' },
  INVALID_AMOUNT: { label: 'Sai số tiền', tone: 'danger' },
  DISABLED: { label: 'VNPAY chưa bật', tone: 'neutral' },
};

const eventSchema = z.object({
  id: z.number(),
  received_at: z.string(),
  txn_ref: z.string().nullable(),
  order_id: z.number().nullable(),
  signature_valid: z.boolean(),
  gateway_code: z.string().nullable(),
  rsp_code: z.string(),
  outcome: z.enum(paymentOutcomes),
});
const pageSchema = z.object({
  items: z.array(eventSchema),
  total: z.number(),
});

const time = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'Asia/Ho_Chi_Minh',
});

function OutcomeTag({ outcome }: { outcome: Outcome }) {
  const view = outcomeView[outcome];
  const icon =
    view.tone === 'success' ? (
      <CheckCircle aria-hidden="true" />
    ) : view.tone === 'danger' ? (
      <Prohibit aria-hidden="true" />
    ) : view.tone === 'warning' ? (
      <WarningCircle aria-hidden="true" />
    ) : undefined;
  return (
    <Tag tone={view.tone} icon={icon} className="whitespace-nowrap">
      {view.label}
    </Tag>
  );
}

// Admin payment log (D30): every VNPAY IPN the shop received and how it answered. Read-only.
export function AdminPaymentLog() {
  const [page, setPage] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | ''>('');
  const query = useQuery({
    queryKey: ['admin-payment-events', outcome, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        size: String(adminPageSize),
      });
      if (outcome) params.set('outcome', outcome);
      return pageSchema.parse(
        await requestJson(`admin/payments/events?${params}`),
      );
    },
    retry: false,
  });
  const pages = query.data
    ? Math.max(1, Math.ceil(query.data.total / adminPageSize))
    : 1;
  return (
    <section id="admin-payments" className="scroll-mt-40 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-copy space-y-2">
          <h2 className="text-3xl font-bold">Nhật ký thanh toán</h2>
          <p className="text-sm text-ink-muted">
            Mỗi lần VNPAY (sandbox) gửi kết quả về, cửa hàng ghi lại cách xử lý.
            Không lưu chữ ký, khóa bí mật hay thông tin khách hàng.
          </p>
        </div>
        <Field label="Lọc theo kết quả" className="w-full sm:w-64">
          {(control) => (
            <Select
              {...control}
              value={outcome}
              onChange={(event) => {
                setOutcome(event.target.value as Outcome | '');
                setPage(0);
              }}
            >
              <option value="">Tất cả</option>
              {paymentOutcomes.map((value) => (
                <option key={value} value={value}>
                  {outcomeView[value].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {query.isPending ? (
        <Skeleton className="h-48 rounded-card" />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={<ClockCounterClockwise />}
          title={
            outcome
              ? 'Không có sự kiện nào với kết quả này.'
              : 'Chưa có sự kiện thanh toán.'
          }
          description="Khi khách thanh toán qua VNPAY sandbox, kết quả sẽ xuất hiện tại đây."
        />
      ) : (
        <>
          <p className="text-sm text-ink-muted" role="status">
            {query.data.total} sự kiện · trang {page + 1} / {pages}
          </p>
          <div
            className="overflow-x-auto rounded-card border border-line bg-surface"
            role="region"
            aria-label="Bảng nhật ký thanh toán"
            tabIndex={0}
          >
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-sunken text-left text-xs text-ink-muted">
                <tr>
                  <th className="p-3 font-semibold">Thời điểm nhận</th>
                  <th className="p-3 font-semibold">Kết quả</th>
                  <th className="p-3 font-semibold">Đơn</th>
                  <th className="p-3 font-semibold">Mã giao dịch</th>
                  <th className="p-3 font-semibold">Mã VNPAY</th>
                  <th className="p-3 font-semibold">Trả lời VNPAY</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((event) => (
                  <tr key={event.id} className="border-t border-line">
                    <td className="p-3 whitespace-nowrap tabular-nums">
                      {time.format(new Date(event.received_at))}
                    </td>
                    <td className="p-3">
                      <OutcomeTag outcome={event.outcome} />
                    </td>
                    <td className="p-3">
                      {event.order_id ? (
                        <Link
                          to={`/admin/orders/${event.order_id}`}
                          className="inline-flex min-h-touch items-center font-bold underline underline-offset-4"
                        >
                          Đơn #{event.order_id}
                        </Link>
                      ) : (
                        <span className="text-ink-muted">Không xác định</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      <span className="break-all">{event.txn_ref ?? '—'}</span>
                      {!event.signature_valid && (
                        <span className="block font-sans text-ink-muted">
                          (chưa tin cậy)
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono">
                      {event.gateway_code ?? '—'}
                    </td>
                    <td className="p-3 font-mono">{event.rsp_code}</td>
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
              disabled={page + 1 >= pages}
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
