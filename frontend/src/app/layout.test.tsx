import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';
import { messages } from './messages.vi';
import { AppRoutes } from './router';

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({ sub: 'test-sub', admin: false }),
  accessToken: async () => null,
  signOut: vi.fn(),
}));

it('labels every primary destination with text and shows the cart count', async () => {
  server.use(
    http.get('*/api/cart', () =>
      HttpResponse.json({
        items: [
          {
            product_id: 1,
            name: 'Yến mạch',
            price: 10000,
            currency: 'VND',
            quantity: 2,
            stock: 5,
            active: true,
          },
        ],
        total: 20000,
      }),
    ),
  );
  renderApp(<AppRoutes />, '/');
  const nav = screen.getByRole('navigation', { name: messages.navigation });
  for (const label of [
    messages.home,
    messages.products,
    messages.chat,
    messages.orders,
  ])
    expect(nav).toContainElement(screen.getByRole('link', { name: label }));
  expect(
    await screen.findByRole('link', {
      name: `${messages.cart}: ${messages.cartCount(2)}`,
    }),
  ).toBeVisible();
  // The first cart load must not be announced as a change.
  expect(
    screen.getByText('', { selector: 'p.sr-only[aria-live="polite"]' }),
  ).toBeEmptyDOMElement();
  expect(screen.queryByRole('link', { name: messages.admin })).toBeNull();
});
