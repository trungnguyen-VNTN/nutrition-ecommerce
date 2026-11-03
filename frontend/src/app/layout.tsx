import { Suspense, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChatCircleText,
  GearSix,
  House,
  Leaf,
  MagnifyingGlass,
  Receipt,
  ShoppingCartSimple,
  SignIn,
  SignOut,
  Storefront,
  type Icon,
} from '@phosphor-icons/react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { signOut, useSession } from '@/features/auth/session';
import { getCart } from '@/features/commerce/api';
import { messages } from './messages.vi';

const links: readonly (readonly [string, string, Icon])[] = [
  ['/', messages.home, House],
  ['/products', messages.products, Storefront],
  ['/chat', messages.chat, ChatCircleText],
  ['/cart', messages.cart, ShoppingCartSimple],
  ['/orders', messages.orders, Receipt],
  ['/admin', messages.admin, GearSix],
];

export function Layout() {
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
  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <a
        className="skip-link rounded-control bg-primary-700 p-4 text-neutral-50"
        href="#main"
      >
        {messages.skip}
      </a>
      <header className="site-header border-b border-neutral-200">
        <div className="page-container flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3 md:py-4">
          <Link
            to="/"
            aria-label={`${messages.brand} — ${messages.home}`}
            className="flex min-h-touch items-center gap-3 text-primary-700"
          >
            <span aria-hidden="true" className="brand-mark text-2xl">
              <Leaf weight="fill" />
            </span>
            <span>
              <span className="block text-2xl font-bold">
                {messages.brand}
                <span className="text-accent-500">.</span>
              </span>
              <span className="brand-tagline block text-xs text-neutral-700">
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
              className="min-h-touch rounded-control border border-neutral-200 bg-neutral-50 px-3 text-base md:text-sm"
            />
            <Button variant="secondary" type="submit" aria-label="Tìm kiếm">
              <MagnifyingGlass />
              <span className="hidden sm:inline">Tìm kiếm</span>
            </Button>
          </form>
          <div className="flex items-center gap-2">
            {identity?.admin && (
              <Button asChild variant="ghost" className="md:hidden">
                <Link to="/admin">
                  <GearSix />
                  {messages.admin}
                </Link>
              </Button>
            )}
            {identity ? (
              <Button
                variant="ghost"
                onClick={() => {
                  signOut();
                  cache.clear();
                }}
              >
                <SignOut />
                Đăng xuất
              </Button>
            ) : (
              <NavLink
                to="/login"
                className="control-transition inline-flex min-h-touch items-center gap-2 rounded-control border border-neutral-200 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-50"
              >
                <SignIn />
                {messages.login}
              </NavLink>
            )}
          </div>
        </div>
        <nav aria-label={messages.navigation} className="site-nav">
          {links
            .filter(([to]) => to !== '/admin' || identity?.admin)
            .map(([to, label, Glyph]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                // Bottom bar keeps five tabs; admins reach admin from the header on phones.
                className={`nav-link control-transition min-h-touch items-center rounded-control font-medium text-neutral-700 hover:bg-neutral-100 ${to === '/admin' ? 'hidden md:inline-flex' : 'inline-flex'}`}
              >
                {({ isActive }) => (
                  <>
                    <Glyph
                      className="icon text-xl md:text-base"
                      weight={isActive ? 'fill' : 'regular'}
                    />
                    {label}
                    {to === '/cart' && count !== undefined && count > 0 && (
                      <>
                        <span aria-hidden="true" className="nav-badge">
                          {count}
                        </span>
                        <span className="sr-only">
                          : {messages.cartCount(count)}
                        </span>
                      </>
                    )}
                  </>
                )}
              </NavLink>
            ))}
        </nav>
      </header>
      <CartAnnouncer count={count} />
      <main
        id="main"
        tabIndex={-1}
        className="page-container flex-1 py-6 md:py-12"
      >
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
          <RouteEffects />
        </Suspense>
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

// Runs after the (lazy) route content has rendered, so the h1 exists.
function RouteEffects() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    const main = document.getElementById('main');
    const title = main?.querySelector('h1')?.textContent ?? messages.brand;
    document.title = `${title} · Nutrition`;
    if (previousPath.current !== pathname) main?.focus();
    previousPath.current = pathname;
  }, [pathname]);
  return null;
}

function RouteFallback() {
  return (
    <div
      aria-busy="true"
      aria-label={messages.loadingPage}
      className="space-y-6"
    >
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-64" />
    </div>
  );
}

// Announces cart changes politely; the first load stays silent.
function CartAnnouncer({ count }: { count: number | undefined }) {
  const [previous, setPrevious] = useState(count);
  const [message, setMessage] = useState('');
  // Adjust state during render (React's pattern for reacting to prop changes).
  if (previous !== count) {
    setPrevious(count);
    if (previous !== undefined && count !== undefined)
      setMessage(messages.cartCount(count));
  }
  return (
    <p className="sr-only" aria-live="polite">
      {message}
    </p>
  );
}
