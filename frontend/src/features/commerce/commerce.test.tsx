import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';
import { CheckoutPage } from './checkout-page';
import { AddToCart } from './cart-page';
import { changeCart } from './api';

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({ sub: 'test-sub' }),
  accessToken: async () => null,
  signOut: vi.fn(),
}));
const cart = {
  items: [
    {
      product_id: 1,
      name: 'Yến mạch',
      price: 10000,
      currency: 'VND',
      quantity: 1,
      stock: 5,
      active: true,
    },
  ],
  total: 10000,
};
describe('commerce boundaries', () => {
  it('adds the selected quantity and blocks quantities above stock', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post('*/api/cart/items', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({
          ...cart,
          total: 30000,
          items: [{ ...cart.items[0], quantity: 3 }],
        });
      }),
    );
    renderApp(<AddToCart id="1" stock={5} />);
    const user = userEvent.setup();
    const quantity = screen.getByRole('spinbutton', { name: 'Số lượng' });
    const submit = screen.getByRole('button', { name: 'Thêm vào giỏ' });
    await user.clear(quantity);
    await user.type(quantity, '6');
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(bodies).toEqual([]);
    await user.clear(quantity);
    await user.type(quantity, '3');
    await user.click(submit);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Đã thêm vào giỏ.',
    );
    expect(bodies).toEqual([{ product_id: 1, quantity: 3 }]);
  });

  it('sends product and quantity, never client price or identity', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/cart/items', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(cart);
      }),
    );
    await changeCart('1', 1, true);
    expect(body).toEqual({ product_id: 1, quantity: 1 });
  });
  it('reuses the checkout idempotency key after a network failure', async () => {
    const keys: (string | null)[] = [];
    server.use(
      http.get('*/api/cart', () => HttpResponse.json(cart)),
      http.post('*/api/orders', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return HttpResponse.json({ code: 'UNAVAILABLE' }, { status: 503 });
      }),
    );
    renderApp(<CheckoutPage />, '/checkout');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Người nhận'), 'Test');
    await user.type(screen.getByLabelText('Số điện thoại'), '000');
    await user.type(screen.getByLabelText('Địa chỉ'), 'Test address');
    await user.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
    await screen.findByRole('alert');
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^[\da-f-]{36}$/);
    expect(keys[1]).toBe(keys[0]);
  });
});
