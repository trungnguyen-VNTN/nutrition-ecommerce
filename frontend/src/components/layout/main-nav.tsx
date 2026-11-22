import {
  Calculator,
  ChatCircleText,
  GearSix,
  ForkKnife,
  House,
  Receipt,
  ShoppingCartSimple,
  Storefront,
  type Icon,
} from '@phosphor-icons/react';
import { NavLink } from 'react-router-dom';
import { messages } from '@/app/messages.vi';

const links: readonly (readonly [string, string, Icon])[] = [
  ['/', messages.home, House],
  ['/products', messages.products, Storefront],
  ['/meal-analyzer', 'Phân tích bữa ăn', Calculator],
  ['/suggestions', 'Gợi ý cho bạn', ForkKnife],
  ['/chat', messages.chat, ChatCircleText],
  ['/cart', messages.cart, ShoppingCartSimple],
  ['/orders', messages.orders, Receipt],
  ['/admin', messages.admin, GearSix],
];

// One <nav>: floating dock below 940px (five tabs), inline row in the header above.
export function MainNav({
  admin,
  cartCount,
}: {
  admin: boolean;
  cartCount: number | undefined;
}) {
  return (
    <nav aria-label={messages.navigation} className="site-nav">
      {links
        .filter(([to]) => to !== '/admin' || admin)
        .map(([to, label, Glyph]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            data-tour={to.slice(1) || undefined}
            // The dock keeps five tabs; admin and the meal analyzer stay in the header row on wider
            // screens and are linked from the products and product pages on phones.
            className={`nav-link control-transition ${['/admin', '/meal-analyzer', '/suggestions'].includes(to) ? 'hidden md:inline-flex' : ''}`}
          >
            {({ isActive }) => (
              <>
                <Glyph
                  className="icon text-xl md:text-base"
                  weight={isActive ? 'fill' : 'regular'}
                />
                {label}
                {to === '/cart' && cartCount !== undefined && cartCount > 0 && (
                  <>
                    <span aria-hidden="true" className="nav-badge">
                      {cartCount}
                    </span>
                    <span className="sr-only">
                      : {messages.cartCount(cartCount)}
                    </span>
                  </>
                )}
              </>
            )}
          </NavLink>
        ))}
    </nav>
  );
}
