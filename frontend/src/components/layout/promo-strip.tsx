import { useState } from 'react';
import { Asterisk, Pause, Play } from '@phosphor-icons/react';
import { allergenOptions } from '@/features/products/api/filters';

// Only facts the shop really offers: no invented discounts or shipping promises.
const facts = [
  'Hơn 150 sản phẩm có số liệu USDA',
  `Lọc theo ${allergenOptions.length} nhóm chất gây dị ứng`,
  'Thiếu dữ liệu thì ghi là thiếu',
  'Phân tích bữa ăn theo từng gam',
  'Thanh toán khi nhận hàng hoặc VNPAY (sandbox)',
];

// Lime ticker under the header. Moving content gets a pause control (WCAG 2.2.2),
// stops on hover and focus, and stays still with reduced motion (CSS).
export function PromoStrip() {
  const [paused, setPaused] = useState(false);
  const row = (hidden: boolean) => (
    <ul className="promo-strip-row" aria-hidden={hidden || undefined}>
      {facts.map((fact) => (
        <li key={fact}>
          <Asterisk aria-hidden="true" weight="bold" className="icon" />
          {fact}
        </li>
      ))}
    </ul>
  );
  return (
    <section
      className="promo-strip"
      aria-label="Điểm nổi bật của cửa hàng"
      data-paused={paused}
    >
      <div className="promo-strip-track">
        {row(false)}
        {row(true)}
      </div>
      <button
        type="button"
        className="promo-strip-toggle"
        aria-pressed={paused}
        aria-label={
          paused ? 'Chạy lại dải thông tin' : 'Tạm dừng dải thông tin'
        }
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? <Play weight="fill" /> : <Pause weight="fill" />}
      </button>
    </section>
  );
}
