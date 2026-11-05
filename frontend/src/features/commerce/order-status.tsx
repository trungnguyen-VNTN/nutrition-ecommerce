import {
  CheckCircle,
  Package,
  Prohibit,
  Receipt,
  Truck,
} from '@phosphor-icons/react';
import { Tag } from '@/components/ui/tag';
import { statusText } from './api';

const looks = {
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
