import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';
import { CheckoutPage } from './checkout-page';
import { OrderDetailPage } from './orders-page';
import { VnpayReturnPage } from './vnpay-return-page';
import { startVnpayPayment } from './api';

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
      price: 69000,
      currency: 'VND',
      quantity: 1,
      stock: 5,
      active: true,
    },
  ],
  total: 69000,
};
const order = {
  id: 42,
  status: 'AWAITING_PAYMENT',
  total: 69000,
  currency: 'VND',
  created_at: '2026-11-16T09:00:00Z',
  payment_method: 'VNPAY',
  payment_status: 'UNPAID',
  payment_expires_at: '2026-11-16T09:15:00Z',
  shipping_name: 'A',
  phone: '0900000000',
  address: 'Addr',
  items: [
    {
      product_id: 1,
      name_snapshot: 'Yến mạch',
      unit_price: 69000,
      quantity: 1,
    },
  ],
};
const gateway =
  'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=6900000';

afterEach(() => vi.unstubAllGlobals());

function stubNavigation() {
  const assign = vi.fn();
  vi.stubGlobal('location', { ...window.location, assign });
  return assign;
}

describe('VNPAY sandbox payment', () => {
  it('places a VNPAY order and leaves for the gateway', async () => {
    const assign = stubNavigation();
    const bodies: unknown[] = [];
    server.use(
      http.get('*/api/cart', () => HttpResponse.json(cart)),
      http.get('*/api/payments/methods', () =>
        HttpResponse.json(['COD', 'VNPAY']),
      ),
      http.post('*/api/orders', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(order);
      }),
      http.post('*/api/orders/42/payments/vnpay', () =>
        HttpResponse.json({ payment_url: gateway }),
      ),
    );
    renderApp(<CheckoutPage />, '/checkout');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Người nhận'), 'A');
    await user.type(screen.getByLabelText('Số điện thoại'), '0900000000');
    await user.type(screen.getByLabelText('Địa chỉ'), 'Addr');
    expect(
      screen.getByRole('radio', { name: /Thanh toán khi nhận hàng/ }),
    ).toBeChecked();
    await user.click(
      await screen.findByRole('radio', { name: /Thanh toán qua VNPAY/ }),
    );
    await user.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(gateway));
    expect(bodies[0]).toMatchObject({ payment_method: 'VNPAY' });
  });

  it('only offers cash on delivery when VNPAY is not configured', async () => {
    server.use(
      http.get('*/api/cart', () => HttpResponse.json(cart)),
      http.get('*/api/payments/methods', () => HttpResponse.json(['COD'])),
    );
    renderApp(<CheckoutPage />, '/checkout');
    expect(
      await screen.findByRole('radio', { name: /Thanh toán khi nhận hàng/ }),
    ).toBeChecked();
    expect(
      screen.queryByRole('radio', { name: /VNPAY/ }),
    ).not.toBeInTheDocument();
  });

  it('never redirects to a host other than VNPAY', async () => {
    server.use(
      http.post('*/api/orders/42/payments/vnpay', () =>
        HttpResponse.json({ payment_url: 'https://evil.example/pay' }),
      ),
    );
    await expect(startVnpayPayment(42)).rejects.toThrow(
      'Unexpected payment URL',
    );
  });

  it('offers payment and cancellation for an order waiting for payment', async () => {
    const assign = stubNavigation();
    server.use(
      http.get('*/api/orders/42', () => HttpResponse.json(order)),
      http.post('*/api/orders/42/payments/vnpay', () =>
        HttpResponse.json({ payment_url: gateway }),
      ),
    );
    renderApp(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      '/orders/42',
    );
    expect(await screen.findByText('Đơn đang chờ thanh toán')).toBeVisible();
    expect(screen.getAllByText('Chờ thanh toán')[0]).toBeVisible();
    expect(screen.getByText('Chưa thanh toán VNPAY')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hủy đơn hàng' })).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Thanh toán bằng VNPAY' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(gateway));
  });

  it.each([
    [
      { payment_status: 'PAID', gateway_code: '00', order_status: 'PLACED' },
      'Thanh toán thành công',
    ],
    [
      {
        payment_status: 'UNPAID',
        gateway_code: '24',
        order_status: 'AWAITING_PAYMENT',
      },
      'Thanh toán chưa thành công',
    ],
    [
      {
        payment_status: 'REFUND_NEEDED',
        gateway_code: '00',
        order_status: 'CANCELLED',
      },
      'Đơn đã hết hạn trước khi nhận tiền',
    ],
  ])(
    'shows the stored result on the return page (%j)',
    async (result, title) => {
      const searches: string[] = [];
      server.use(
        http.get('*/api/payments/vnpay/return', ({ request }) => {
          searches.push(new URL(request.url).search);
          return HttpResponse.json({ order_id: 42, ...result });
        }),
      );
      renderApp(
        <Routes>
          <Route path="/payment/vnpay-return" element={<VnpayReturnPage />} />
        </Routes>,
        '/payment/vnpay-return?vnp_TxnRef=42NABC&vnp_SecureHash=abc',
      );
      expect(await screen.findByRole('heading', { name: title })).toBeVisible();
      // The page forwards VNPAY's signed parameters unchanged for server-side checking.
      expect(searches[0]).toBe('?vnp_TxnRef=42NABC&vnp_SecureHash=abc');
      expect(
        screen.getByRole('link', { name: 'Xem đơn hàng' }),
      ).toHaveAttribute('href', '/orders/42');
    },
  );
});
