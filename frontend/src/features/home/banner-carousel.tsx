import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Pause, Play } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import protein800 from '@/assets/banners/banner-protein-800.webp';
import protein1600 from '@/assets/banners/banner-protein-1600.webp';
import legumes800 from '@/assets/banners/banner-hat-dau-800.webp';
import legumes1600 from '@/assets/banners/banner-hat-dau-1600.webp';
import payment800 from '@/assets/banners/banner-thanh-toan-800.webp';
import payment1600 from '@/assets/banners/banner-thanh-toan-1600.webp';

export const bannerInterval = 6000;

// Each banner points at something the shop really has: a filter, the meal tool or checkout.
const slides = [
  {
    tag: 'Giàu protein',
    title: 'Protein ≥ 20%',
    accent: 'năng lượng.',
    text: 'Nhãn tính từ số liệu USDA theo ngưỡng EU 1924/2006, không gắn tay.',
    cta: 'Xem sản phẩm giàu protein',
    to: '/products?label=HIGH_PROTEIN',
    image: [protein800, protein1600],
    tone: 'dark',
  },
  {
    tag: 'Hạt & đậu',
    title: 'Chất xơ',
    accent: 'từ thực vật.',
    text: 'Đậu gà 12,2 g, hạnh nhân 12,5 g chất xơ mỗi 100 g.',
    cta: 'Xem sản phẩm nhiều chất xơ',
    to: '/products?label=HIGH_FIBER',
    image: [legumes800, legumes1600],
    tone: 'light',
  },
  {
    tag: 'Thanh toán',
    title: 'Trả khi nhận hàng',
    accent: 'hoặc qua VNPAY.',
    text: 'VNPAY chạy ở chế độ sandbox của đồ án: không trừ tiền thật.',
    cta: 'Mở giỏ hàng',
    to: '/cart',
    image: [payment800, payment1600],
    tone: 'dark',
  },
] as const;

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Rotating banner with WAI carousel behaviour: a pause button, no rotation while the
// pointer or keyboard focus is inside, none at all with reduced motion; hidden slides are inert.
export function BannerCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(reducedMotion);
  const [holding, setHolding] = useState(false);
  const rotating = !paused && !holding;

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % slides.length),
      bannerInterval,
    );
    return () => window.clearInterval(timer);
  }, [rotating]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Nổi bật"
      className="banner-carousel"
      data-rotating={rotating}
      data-tone={slides[active]?.tone}
      onPointerEnter={() => setHolding(true)}
      onPointerLeave={() => setHolding(false)}
      onFocus={() => setHolding(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setHolding(false);
      }}
    >
      {slides.map((slide, index) => {
        const current = index === active;
        return (
          <div
            key={slide.tag}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${slides.length}: ${slide.tag}`}
            className="banner-slide"
            data-tone={slide.tone}
            data-active={current}
            aria-hidden={!current}
            inert={!current}
          >
            <img
              src={slide.image[0]}
              srcSet={`${slide.image[0]} 800w, ${slide.image[1]} 1600w`}
              sizes="(min-width: 1240px) 1176px, 100vw"
              width="1600"
              height="900"
              alt=""
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              className="banner-image"
            />
            <div className="banner-copy">
              <p className="banner-tag">{slide.tag}</p>
              <p className="banner-title">
                {slide.title}
                <br />
                <span className="banner-accent">{slide.accent}</span>
              </p>
              <p className="banner-text">{slide.text}</p>
              <Link to={slide.to} className="banner-cta">
                {slide.cta} <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        );
      })}
      <div className="banner-controls">
        {slides.map((slide, index) => (
          <button
            key={slide.tag}
            type="button"
            className="banner-dot"
            aria-label={`Banner ${index + 1}: ${slide.tag}`}
            aria-current={index === active || undefined}
            onClick={() => setActive(index)}
          >
            <span
              className={cn(
                'banner-dot-fill',
                index === active && rotating && 'is-running',
              )}
              key={`${active}-${rotating}`}
            />
          </button>
        ))}
        <button
          type="button"
          className="banner-toggle"
          aria-pressed={paused}
          aria-label={paused ? 'Tự chuyển banner' : 'Tạm dừng banner'}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play weight="fill" /> : <Pause weight="fill" />}
        </button>
      </div>
    </section>
  );
}
