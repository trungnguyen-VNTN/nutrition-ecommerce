import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  GearSix,
  Leaf,
  MagnifyingGlass,
  SignIn,
  SignOut,
  Sparkle,
} from '@phosphor-icons/react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { messages } from '@/app/messages.vi';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from '@/features/auth/session';

// Header: brand, product search (API `q`), "Hỏi AI" shortcut, account; nav rides below.
export function SiteHeader({ nav }: { nav: ReactNode }) {
  const navigate = useNavigate();
  const identity = useSession();
  const cache = useQueryClient();
  return (
    <header className="site-header">
      <div className="page-container flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
        <Link
          to="/"
          aria-label={`${messages.brand} — ${messages.home}`}
          className="flex min-h-touch items-center gap-2 text-ink"
        >
          <span aria-hidden="true" className="brand-mark text-2xl">
            <Leaf weight="fill" />
          </span>
          <span className="font-display text-2xl font-extrabold tracking-tight">
            {messages.brand}
            <span className="text-brand">.</span>
          </span>
        </Link>
        <form
          className="header-field order-last w-full md:order-none md:max-w-copy md:flex-1"
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
          <MagnifyingGlass className="icon text-ink-muted" />
          <input
            id="site-search"
            name="q"
            type="search"
            maxLength={100}
            placeholder="Tìm yến mạch, hạt, sữa…"
            className="min-h-touch text-base"
          />
          <button
            type="submit"
            className="control-transition -mr-2 inline-flex min-h-touch items-center rounded-pill px-3 text-sm font-semibold text-brand hover:bg-sunken"
          >
            Tìm kiếm
          </button>
        </form>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/chat" className="ask-ai control-transition">
            <Sparkle weight="fill" />
            <span className="sr-only sm:not-sr-only">{messages.askAi}</span>
          </Link>
          {identity?.admin && (
            <Button asChild variant="ghost" className="md:hidden">
              <Link to="/admin">
                <GearSix />
                <span className="sr-only sm:not-sr-only">{messages.admin}</span>
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
              {/* Labels stay in the accessibility tree; phones show the icon only. */}
              <span className="sr-only sm:not-sr-only">Đăng xuất</span>
            </Button>
          ) : (
            <NavLink
              to="/login"
              className="control-transition inline-flex min-h-touch items-center gap-2 rounded-pill border border-ink px-4 text-sm font-semibold text-ink hover:bg-surface"
            >
              <SignIn />
              {messages.login}
            </NavLink>
          )}
        </div>
      </div>
      <div className="page-container md:pb-2">{nav}</div>
    </header>
  );
}
