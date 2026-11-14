import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';
import { AdminStats } from './admin-stats';

const stats = {
  orders: {
    total: 6,
    by_status: {
      PLACED: 2,
      CONFIRMED: 1,
      SHIPPED: 1,
      DELIVERED: 1,
      CANCELLED: 1,
    },
    revenue: 450000,
    currency: 'VND',
  },
  recent_days: [
    { date: '2026-11-07', orders: 0 },
    { date: '2026-11-08', orders: 1 },
    { date: '2026-11-09', orders: 0 },
    { date: '2026-11-10', orders: 2 },
    { date: '2026-11-11', orders: 0 },
    { date: '2026-11-12', orders: 1 },
    { date: '2026-11-13', orders: 2 },
  ],
  catalog: {
    active_products: 41,
    out_of_stock: 1,
    low_stock: 2,
    missing_nutrition: 3,
    allergens_unverified: 2,
    allergens_sample: 38,
  },
  low_stock_items: [
    { id: 7, name: 'Hạt chia', stock: 0 },
    { id: 9, name: 'Hạt bí', stock: 3 },
  ],
  low_stock_threshold: 5,
};

describe('admin stats', () => {
  it('shows totals, a labelled 7-day series and low-stock links', async () => {
    server.use(http.get('*/api/admin/stats', () => HttpResponse.json(stats)));
    renderApp(<AdminStats />);
    expect(await screen.findByText('Tổng đơn hàng')).toBeVisible();
    expect(screen.getByText('3 đơn chờ xử lý · 1 đã hủy')).toBeVisible();
    expect(screen.getByText('40')).toBeVisible();
    const days = screen.getByRole('list', { name: 'Số đơn theo ngày' });
    expect(within(days).getAllByRole('listitem')).toHaveLength(7);
    expect(within(days).getByText(/13\/11/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Hạt chia' })).toHaveAttribute(
      'href',
      '/admin/products/7',
    );
    expect(screen.getByText('Hết hàng')).toBeVisible();
    expect(screen.getByText('Còn 3')).toBeVisible();
  });

  it('offers a retry when the stats cannot be loaded', async () => {
    server.use(
      http.get('*/api/admin/stats', () =>
        HttpResponse.json({ code: 'INTERNAL' }, { status: 500 }),
      ),
    );
    renderApp(<AdminStats />);
    expect(
      await screen.findByRole('button', { name: /Thử lại/ }),
    ).toBeVisible();
  });
});
