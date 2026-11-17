import { useState } from 'react';
import { ArrowUpRight, Pause, Play } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { allergenOptions } from '@/features/products/api/filters';

// Only facts the shop really offers: no invented discounts or shipping promises.
// Each one is a "readout": a big number chip, a short label and a link to where it is true.
const facts = [
  { stat: '150+', text: 'sản phẩm có số liệu USDA', to: '/products' },
  {
    stat: String(allergenOptions.length),
    text: 'nhóm chất gây dị ứng để lọc',
    to: '/products',
  },
  { stat: '0', text: 'con số đoán mò: thiếu thì ghi thiếu', to: '/products' },
  { stat: '1 g', text: 'phân tích bữa ăn theo từng gam', to: '/meal-analyzer' },
  {
    stat: 'COD',
    text: 'hoặc VNPAY (sandbox) khi thanh toán',
    to: '/cart',
  },
];

// Dark "lab readout" ticker under the header. Moving content gets a pause control
// (WCAG 2.2.2), stops on hover and focus, and stays still with reduced motion (CSS).
export function PromoStrip() {
  const [paused, setPaused] = useState(false);
  const row = (hidden: boolean) => (
    <ul className="promo-strip-row" aria-hidden={hidden || undefined}>
      {facts.map((fact) => (
        <li key={fact.text}>
          {/* The copy row is only for the seamless loop: keep it out of the tab order. */}
          <Link
            to={fact.to}
            className="promo-fact"
            tabIndex={hidden ? -1 : undefined}
          >
            <span className="promo-fact-stat">{fact.stat}</span>
            <span>{fact.text}</span>
            <ArrowUpRight
              aria-hidden="true"
              weight="bold"
              className="promo-fact-arrow"
            />
          </Link>
          <span aria-hidden="true" className="promo-fact-sep" />
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
      <p className="promo-strip-label">
        <span aria-hidden="true" className="promo-strip-dot" />
        <span className="max-sm:sr-only">Lab notes</span>
      </p>
      <div className="promo-strip-viewport">
        <div className="promo-strip-track">
          {row(false)}
          {row(true)}
        </div>
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
