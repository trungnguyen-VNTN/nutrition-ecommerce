import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from '@/features/auth/session';
import { getCart } from '@/features/commerce/api';
import { useEffect, useRef } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { messages } from './messages.vi';

const links = [
  ['/', messages.home],
  ['/products', messages.products],
  ['/cart', messages.cart],
  ['/orders', messages.orders],
  ['/chat', messages.chat],
  ['/admin', messages.admin],
] as const;
export function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const identity = useSession();
  const cache = useQueryClient();
  const cart = useQuery({
    queryKey: ['cart', identity?.sub],
    queryFn: getCart,
    enabled: !!identity,
    retry: false,
  });
  const count = cart.data?.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  useEffect(() => {
    const title =
      main.current?.querySelector('h1')?.textContent ?? messages.brand;
    document.title = `${title} · Nutrition`;
    if (previousPath.current !== pathname) main.current?.focus();
    previousPath.current = pathname;
  }, [pathname]);
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        className="skip-link rounded-control bg-primary-700 p-4 text-neutral-50"
        href="#main"
      >
        {messages.skip}
      </a>
      <header className="site-header border-b border-neutral-200">
        <div className="page-container flex flex-wrap items-center justify-between gap-4 py-4">
          <Link
            to="/"
            aria-label={`${messages.brand} — ${messages.home}`}
            className="flex min-h-touch items-center gap-3 text-primary-700"
          >
            <span aria-hidden="true" className="brand-mark text-3xl">
              ✳
            </span>
            <span>
              <span className="block text-2xl font-bold">
                {messages.brand}
                <span className="text-accent-500">.</span>
              </span>
              <span className="block text-xs text-neutral-700">
                {messages.tagline}
              </span>
            </span>
          </Link>
          <form
            className="header-search order-last w-full md:order-none md:w-auto"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const q = String(
                new FormData(event.currentTarget).get('q') ?? '',
              ).trim();
              navigate('/products?' + new URLSearchParams(q ? { q } : {}));
            }}
          >
            <label className="sr-only" htmlFor="site-search">
              Tìm trong cửa hàng
            </label>
            <input
              id="site-search"
              name="q"
              type="search"
              maxLength={100}
              placeholder="Bạn đang tìm thực phẩm nào?"
              className="min-h-touch rounded-control border border-neutral-200 bg-neutral-50 px-3 text-sm"
            />
            <Button variant="secondary" type="submit">
              Tìm kiếm
            </Button>
          </form>
          {identity ? (
            <Button
              variant="ghost"
              onClick={() => {
                signOut();
                cache.clear();
              }}
            >
              Đăng xuất
            </Button>
          ) : (
            <NavLink
              to="/login"
              className="inline-flex min-h-touch items-center rounded-control border border-neutral-200 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-50"
            >
              {messages.login}
            </NavLink>
          )}
        </div>
        <nav
          aria-label={messages.navigation}
          className="page-container flex flex-wrap gap-2 pb-3"
        >
          {links
            .filter(([to]) => to !== '/admin' || identity?.admin)
            .map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className="nav-link inline-flex min-h-touch items-center gap-2 rounded-control px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                {label}
                {to === '/cart' && count !== undefined && (
                  <span
                    aria-label={`${count} sản phẩm trong giỏ`}
                    className="rounded-pill bg-primary-100 px-2 text-xs text-primary-700"
                  >
                    {count}
                  </span>
                )}
              </NavLink>
            ))}
        </nav>
      </header>
      <main
        ref={main}
        id="main"
        tabIndex={-1}
        className="page-container flex-1 py-8 md:py-12"
      >
        <Outlet />
      </main>
      <footer className="site-footer mt-12">
        <div className="page-container grid gap-8 py-12 md:grid-cols-3">
          <div className="space-y-3">
            <p className="text-2xl font-bold">nutrition.</p>
            <p className="text-lg">{messages.footer}</p>
            <p className="text-sm">
              Thông tin rõ ràng cho từng lựa chọn hằng ngày.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Khám phá cửa hàng</h2>
            <div className="flex flex-col items-start">
              <Link to="/products">Tất cả sản phẩm</Link>
              <Link to="/chat">Trợ lý dinh dưỡng AI</Link>
              <Link to="/orders">Theo dõi đơn hàng</Link>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Mua sắm có thông tin</h2>
            <p className="text-sm">
              Dinh dưỡng theo khẩu phần. Allergen được ghi rõ cùng trạng thái
              xác minh.
            </p>
            <p className="text-sm">{messages.medicalNote}.</p>
            <p className="text-xs">
              {messages.footerNote} · Nutrition E-Commerce
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
