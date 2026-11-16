import {
  ArrowCounterClockwise,
  CheckCircle,
  CreditCard,
  HourglassMedium,
  Money,
  Package,
  Prohibit,
  Receipt,
  Truck,
} from '@phosphor-icons/react';
import { Tag } from '@/components/ui/tag';
import { statusText } from './api';

const looks = {
  AWAITING_PAYMENT: { tone: 'warning', Glyph: HourglassMedium },
  PLACED: { tone: 'neutral', Glyph: Receipt },
  CONFIRMED: { tone: 'lime', Glyph: Package },
  SHIPPED: { tone: 'lime', Glyph: Truck },
  DELIVERED: { tone: 'success', Glyph: CheckCircle },
  CANCELLED: { tone: 'danger', Glyph: Prohibit },
} as const;

// Every status pairs icon and Vietnamese text; colour is never the only signal.
export function OrderStatus({ status }: { status: keyof typeof looks }) {
  const { tone, Glyph } = looks[status];
  return (
    <Tag tone={tone} icon={<Glyph />} className="text-sm">
      {statusText[status]}
    </Tag>
  );
}

// Payment state of an order (D27), always as icon + text.
export function PaymentStatus({
  method,
  status,
}: {
  method: 'COD' | 'VNPAY';
  status: 'UNPAID' | 'PAID' | 'REFUND_NEEDED';
}) {
  if (status === 'REFUND_NEEDED')
    return (
      <Tag tone="danger" icon={<ArrowCounterClockwise />} className="text-sm">
        Cần hoàn tiền
      </Tag>
    );
  if (method === 'COD')
    return (
      <Tag icon={<Money />} className="text-sm">
        Thanh toán khi nhận hàng
      </Tag>
    );
  return status === 'PAID' ? (
    <Tag tone="success" icon={<CreditCard />} className="text-sm">
      Đã thanh toán VNPAY
    </Tag>
  ) : (
    <Tag tone="warning" dashed icon={<CreditCard />} className="text-sm">
      Chưa thanh toán VNPAY
    </Tag>
  );
}
