import { Leaf } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { messages } from '@/app/messages.vi';

export function SiteFooter() {
  return (
    <footer className="site-footer mt-16">
      <div className="page-container grid gap-10 py-12 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3 sm:col-span-2 md:col-span-1">
          <p className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <span
              aria-hidden="true"
              className="brand-mark bg-lime text-xl text-brand"
            >
              <Leaf weight="fill" />
            </span>
            {messages.brand}.
          </p>
          <p className="max-w-copy text-lg">{messages.footer}</p>
          <p className="text-sm">
            Dinh dưỡng theo khẩu phần. Allergen ghi rõ cùng trạng thái xác minh.
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-base font-bold">Khám phá</h2>
          <div className="flex flex-col items-start">
            <Link to="/products">Tất cả sản phẩm</Link>
            <Link to="/chat">Trợ lý dinh dưỡng AI</Link>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-base font-bold">Tài khoản</h2>
          <div className="flex flex-col items-start">
            <Link to="/cart">{messages.cart}</Link>
            <Link to="/orders">Theo dõi đơn hàng</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-cream/25">
        <p className="page-container flex flex-wrap justify-between gap-x-6 gap-y-1 py-5 text-xs">
          <span>
            © 2026 {messages.brand}. · {messages.footerNote}
          </span>
          <span>{messages.medicalNote}.</span>
        </p>
      </div>
    </footer>
  );
}
