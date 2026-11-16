import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  HourglassMedium,
  WarningCircle,
} from '@phosphor-icons/react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/api/client';
import { getVnpayReturn, type vnpayReturnSchema } from './api';
import type { z } from 'zod';

type Result = z.infer<typeof vnpayReturnSchema>;

// Where VNPAY sends the shopper back (D27). The result shown is read from our database; the
// payment itself is only confirmed by VNPAY's server-to-server IPN, so "waiting" is a real state.
function outcome(result: Result) {
  if (result.payment_status === 'PAID')
    return {
      tone: 'success' as const,
      Glyph: CheckCircle,
      title: 'Thanh toán thành công',
      text: `Đơn #${result.order_id} đã được thanh toán và đang chờ cửa hàng xác nhận.`,
    };
  if (result.payment_status === 'REFUND_NEEDED')
    return {
      tone: 'warning' as const,
      Glyph: WarningCircle,
      title: 'Đơn đã hết hạn trước khi nhận tiền',
      text: `Đơn #${result.order_id} đã bị hủy; cửa hàng sẽ hoàn tiền qua VNPAY.`,
    };
  if (result.gateway_code === '00')
    return {
      tone: 'neutral' as const,
      Glyph: HourglassMedium,
      title: 'Đang chờ VNPAY xác nhận',
      text: 'VNPAY báo giao dịch thành công; trang sẽ tự cập nhật khi cửa hàng nhận được xác nhận.',
    };
  return {
    tone: 'danger' as const,
    Glyph: WarningCircle,
    title: 'Thanh toán chưa thành công',
    text:
      result.order_status === 'AWAITING_PAYMENT'
        ? `Bạn có thể thanh toán lại cho đơn #${result.order_id} trước khi hết hạn giữ hàng.`
        : `Đơn #${result.order_id} không còn chờ thanh toán.`,
  };
}

const tones = {
  success: 'border-success bg-success-tint text-success',
  warning: 'border-warning bg-warning-tint text-warning',
  neutral: 'border-line bg-sunken text-ink',
  danger: 'border-danger bg-danger-tint text-danger',
};

export function VnpayReturnPage() {
  const { search } = useLocation();
  const query = useQuery({
    queryKey: ['vnpay-return', search],
    queryFn: ({ signal }) => getVnpayReturn(search, signal),
    retry: false,
    // While VNPAY's confirmation has not arrived yet, check again a few times.
    refetchInterval: (q) =>
      q.state.data &&
      q.state.data.payment_status === 'UNPAID' &&
      q.state.data.gateway_code === '00' &&
      q.state.dataUpdateCount < 10
        ? 3000
        : false,
  });
  return (
    <section className="mx-auto w-full max-w-xl space-y-6 md:py-8">
      <header className="space-y-2">
        <p className="eyebrow">Thanh toán VNPAY (thử nghiệm)</p>
        <h1 className="text-3xl font-extrabold">Kết quả thanh toán</h1>
      </header>
      {!search ? (
        <p role="alert">Không có thông tin giao dịch.</p>
      ) : query.isPending ? (
        <Skeleton className="h-40 rounded-card" />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <Result result={query.data} />
      )}
    </section>
  );
}

function Result({ result }: { result: Result }) {
  const { tone, Glyph, title, text } = outcome(result);
  return (
    <Card className={`space-y-4 border ${tones[tone]}`}>
      <div role="status" className="flex items-start gap-3">
        <Glyph aria-hidden="true" className="icon mt-1 text-2xl" />
        <div className="space-y-1">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-ink">{text}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="sticker">
          <Link to={`/orders/${result.order_id}`}>Xem đơn hàng</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/products">Tiếp tục mua sắm</Link>
        </Button>
      </div>
      <p className="text-xs text-ink-muted">
        Để xem đơn, bạn có thể cần đăng nhập lại vì phiên đăng nhập chỉ lưu
        trong bộ nhớ.
      </p>
    </Card>
  );
}
