import { Suspense, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminShell } from '@/components/layout/admin-shell';
import { MainNav } from '@/components/layout/main-nav';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/session';
import { getCart } from '@/features/commerce/api';
import { messages } from './messages.vi';

export function Layout() {
  const identity = useSession();
  const { pathname } = useLocation();
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
  const page = (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
      <RouteEffects />
    </Suspense>
  );
  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <a
        className="skip-link rounded-control bg-ink p-4 text-cream"
        href="#main"
      >
        {messages.skip}
      </a>
      <SiteHeader
        nav={<MainNav admin={!!identity?.admin} cartCount={count} />}
      />
      <CartAnnouncer count={count} />
      <main
        id="main"
        tabIndex={-1}
        className="page-container flex-1 py-6 md:py-10"
      >
        {pathname.startsWith('/admin') ? <AdminShell>{page}</AdminShell> : page}
      </main>
      <SiteFooter />
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
