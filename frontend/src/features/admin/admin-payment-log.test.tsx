import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';
import { AdminPaymentLog } from './admin-payment-log';

const events = [
  {
    id: 3,
    received_at: '2026-11-20T11:05:00Z',
    txn_ref: '12NABCD2345',
    order_id: 12,
    signature_valid: true,
    gateway_code: '00',
    rsp_code: '00',
    outcome: 'PAID',
  },
  {
    id: 2,
    received_at: '2026-11-20T11:00:00Z',
    txn_ref: 'FORGED1',
    order_id: null,
    signature_valid: false,
    gateway_code: null,
    rsp_code: '97',
    outcome: 'INVALID_SIGNATURE',
  },
];

describe('admin payment log', () => {
  it('lists each IPN with a text outcome and flags untrusted references', async () => {
    server.use(
      http.get('*/api/admin/payments/events', () =>
        HttpResponse.json({ items: events, total: 2, page: 0, size: 20 }),
      ),
    );
    renderApp(<AdminPaymentLog />);
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    const [, paid, forged] = rows as [HTMLElement, HTMLElement, HTMLElement];
    expect(within(paid).getByText('Đã thanh toán')).toBeVisible();
    expect(within(paid).getByRole('link', { name: 'Đơn #12' })).toHaveAttribute(
      'href',
      '/admin/orders/12',
    );
    expect(within(forged).getByText('Sai chữ ký')).toBeVisible();
    expect(within(forged).getByText('(chưa tin cậy)')).toBeVisible();
    expect(within(forged).getByText('Không xác định')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('2 sự kiện');
  });

  it('filters by outcome on the server and shows an empty state', async () => {
    const seen: string[] = [];
    server.use(
      http.get('*/api/admin/payments/events', ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('outcome') ?? '');
        return HttpResponse.json({ items: [], total: 0, page: 0, size: 20 });
      }),
    );
    renderApp(<AdminPaymentLog />);
    expect(
      await screen.findByText('Chưa có sự kiện thanh toán.'),
    ).toBeVisible();
    await userEvent.selectOptions(
      screen.getByLabelText('Lọc theo kết quả'),
      'REFUND_NEEDED',
    );
    expect(
      await screen.findByText('Không có sự kiện nào với kết quả này.'),
    ).toBeVisible();
    expect(seen).toContain('REFUND_NEEDED');
  });
});
