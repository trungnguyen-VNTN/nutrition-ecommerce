import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
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
      <header className="border-b border-neutral-200">
        <div className="page-container flex flex-wrap items-center justify-between gap-4 py-4">
          <Link
            to="/"
            aria-label={`${messages.brand} — ${messages.home}`}
            className="flex min-h-touch items-center gap-3 text-primary-700"
          >
            <span aria-hidden="true" className="text-3xl">
              ✳
            </span>
            <span>
              <span className="block text-2xl font-bold">{messages.brand}</span>
              <span className="block text-xs text-neutral-700">
                {messages.tagline}
              </span>
            </span>
          </Link>
          <NavLink
            to="/login"
            className="inline-flex min-h-touch items-center rounded-control border border-neutral-200 px-4 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            {messages.login}
          </NavLink>
        </div>
        <nav
          aria-label={messages.navigation}
          className="page-container flex flex-wrap gap-2 pb-4"
        >
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="nav-link inline-flex min-h-touch items-center rounded-control px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {label}
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
      <footer className="mt-8 border-t border-neutral-200 bg-neutral-100">
        <div className="page-container flex flex-col gap-2 py-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-medium">{messages.footer}</p>
          <p className="text-xs text-neutral-700">{messages.footerNote}</p>
        </div>
      </footer>
    </div>
  );
}
