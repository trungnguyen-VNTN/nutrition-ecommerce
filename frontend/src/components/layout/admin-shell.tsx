import { useEffect, type ReactNode } from 'react';
import {
  ArrowSquareOut,
  Package,
  Receipt,
  SquaresFour,
} from '@phosphor-icons/react';
import { Link, useLocation } from 'react-router-dom';
import { messages } from '@/app/messages.vi';
import { useSession } from '@/features/auth/session';

const sections = [
  ['admin-products', 'Sản phẩm & tồn kho', Package],
  ['admin-categories', 'Danh mục', SquaresFour],
  ['admin-orders', 'Đơn hàng', Receipt],
] as const;

// Wraps every /admin route. Navigation only renders for admins; pages keep their own access checks.
export function AdminShell({ children }: { children: ReactNode }) {
  const identity = useSession();
  const { pathname, hash } = useLocation();
  useEffect(() => {
    // Client-side hash links do not scroll by themselves; a full reload would drop the in-memory session.
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [pathname, hash]);
  if (!identity?.admin) return children;
  return (
    <div className="admin-shell">
      <nav aria-label={messages.adminNavigation} className="admin-nav">
        <p className="w-full px-3 pt-1 text-xs font-bold tracking-wider text-ink-muted uppercase">
          {messages.adminArea}
        </p>
        {sections.map(([id, label, Glyph]) => (
          <Link
            key={id}
            to={`/admin#${id}`}
            aria-current={
              pathname === '/admin' && hash === `#${id}`
                ? 'location'
                : undefined
            }
          >
            <Glyph />
            {label}
          </Link>
        ))}
        <Link
          to="/products"
          className="text-ink-muted md:mt-2 md:border-t md:border-line md:pt-2"
        >
          <ArrowSquareOut />
          {messages.viewStore}
        </Link>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
