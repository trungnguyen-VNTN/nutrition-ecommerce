import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { productPage } from '@/mocks/products';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';
import { parseItems } from './meal-api';
import { MealPage } from './meal-page';

const analysis = (overrides: object = {}) => ({
  items: [
    {
      product_id: 7,
      name: 'Ức gà phi lê',
      grams: 150,
      complete: true,
      amounts: {
        calories: 180,
        protein_g: 33.8,
        carbs_g: 0,
        fat_g: 3.9,
        sugar_g: 0,
        fiber_g: 0,
        sodium_mg: 67.5,
      },
    },
  ],
  total_grams: 150,
  total: {
    calories: 180,
    protein_g: 33.8,
    carbs_g: 0,
    fat_g: 3.9,
    sugar_g: null,
    fiber_g: 0,
    sodium_mg: 67.5,
  },
  complete: true,
  incomplete_products: [],
  diet_labels: ['HIGH_PROTEIN', 'LOW_SODIUM'],
  ...overrides,
});

function capture(body = analysis()) {
  const requests: unknown[] = [];
  server.use(
    http.post('*/api/nutrition/analyze', async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json(body);
    }),
  );
  return requests;
}

describe('meal analyzer', () => {
  it('reads only valid, unique items from the link', () => {
    expect(parseItems('7:150,7:20,0:10,abc,9:0,8:5001,3:99.5')).toEqual([
      { productId: 7, grams: 150 },
      { productId: 3, grams: 99.5 },
    ]);
  });

  it('shows database totals, the energy split and meal labels', async () => {
    const requests = capture();
    renderApp(<MealPage />, '/meal-analyzer?items=7:150');
    expect(await screen.findByText('180')).toBeVisible();
    expect(requests[0]).toEqual({ items: [{ product_id: 7, grams: 150 }] });
    const table = screen.getByRole('table');
    expect(within(table).getByText('33,8 g')).toBeVisible();
    // Unknown is shown as unknown, not as 0.
    expect(within(table).getByText('Chưa đủ dữ liệu')).toBeVisible();
    expect(screen.getByText('Giàu protein')).toBeVisible();
    expect(screen.getByText('Năng lượng từ chất đa lượng')).toBeVisible();
  });

  it('names products without complete data instead of counting them as zero', async () => {
    capture(
      analysis({
        complete: false,
        incomplete_products: ['Bột ca cao không đường'],
        diet_labels: [],
      }),
    );
    renderApp(<MealPage />, '/meal-analyzer?items=7:150,9:20');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Bột ca cao không đường chưa có đủ dữ liệu',
    );
    expect(screen.getByText(/\(chưa đầy đủ\)/)).toBeVisible();
  });

  it('adds a product from search and removes it again', async () => {
    const user = userEvent.setup();
    const requests = capture();
    // The real API uses numeric ids; the shared mocks use slugs.
    server.use(
      http.get('*/api/products', () =>
        HttpResponse.json({
          ...productPage,
          items: productPage.items.map((p, i) => ({ ...p, id: i + 1 })),
        }),
      ),
    );
    renderApp(<MealPage />, '/meal-analyzer');
    await user.type(screen.getByLabelText('Tìm sản phẩm để thêm'), 'Yến');
    await user.click(
      await screen.findByRole('button', { name: 'Thêm Yến mạch nguyên hạt' }),
    );
    expect(
      await screen.findByLabelText('Yến mạch nguyên hạt (gram)'),
    ).toHaveValue(100);
    await waitFor(() => expect(requests.length).toBeGreaterThan(0));
    await user.click(
      screen.getByRole('button', { name: 'Bỏ Yến mạch nguyên hạt' }),
    );
    expect(screen.getByText(/Chưa có thực phẩm nào/)).toBeVisible();
  });
});
