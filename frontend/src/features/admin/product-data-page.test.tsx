import { beforeEach, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/mocks/server';
import { ProductDataPage } from './product-data-page';

const state = vi.hoisted(() => ({ admin: true }));
vi.mock('@/features/auth/session', () => ({
  useSession: () => ({ sub: 'admin-test', admin: state.admin }),
  accessToken: async () => null,
  signOut: vi.fn(),
}));
const data = {
  name: 'Test food',
  serving_size: 100,
  serving_unit: 'g',
  nutrition_complete: false,
  allergens_verified: false,
  nutrition: null,
  allergens: [],
  available_allergens: [{ code: 'peanut', name: 'Đậu phộng' }],
};
function mount() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: 0 } },
        })
      }
    >
      <MemoryRouter initialEntries={['/admin/products/1']}>
        <Routes>
          <Route path="/admin/products/:id" element={<ProductDataPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  state.admin = true;
  server.use(
    http.get('*/api/admin/products/1/data', () => HttpResponse.json(data)),
  );
});
it('submits missing nutrients as null and only explicitly confirms allergens', async () => {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    http.put('*/api/admin/products/1/nutrition', async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({ nutrition_complete: false });
    }),
    http.put('*/api/admin/products/1/allergens', async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({ allergens_verified: true });
    }),
  );
  mount();
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Nguồn dữ liệu'), 'Label');
  await user.type(screen.getByLabelText('Năng lượng (kcal)'), '0');
  await user.click(screen.getByRole('button', { name: 'Lưu dinh dưỡng' }));
  await screen.findByRole('status');
  expect(bodies[0]).toMatchObject({
    calories: 0,
    protein_g: null,
    source: 'Label',
  });
  await user.selectOptions(screen.getByLabelText('Đậu phộng'), 'may_contain');
  await user.click(screen.getByLabelText('Tôi đã xác minh danh sách allergen'));
  await user.click(screen.getByRole('button', { name: 'Lưu allergen' }));
  await waitFor(() => expect(bodies).toHaveLength(2));
  expect(bodies[1]).toEqual({
    verified: true,
    items: [{ code: 'peanut', kind: 'may_contain' }],
  });
});
it('does not request admin data for a regular user', async () => {
  state.admin = false;
  const request = vi.fn();
  server.use(
    http.get('*/api/admin/products/1/data', () => {
      request();
      return HttpResponse.json(data);
    }),
  );
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('không có quyền');
  expect(request).not.toHaveBeenCalled();
});
