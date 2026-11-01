import { expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';
import { CategoriesPanel } from './categories-panel';

it('creates a category from an empty catalog and preserves it when deletion conflicts', async () => {
  const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(true);
  let created = false;
  let payload: unknown;
  server.use(
    http.get('*/api/categories', () =>
      HttpResponse.json(
        created ? [{ id: 10, name: 'Ngũ cốc', slug: 'ngu-coc' }] : [],
      ),
    ),
    http.post('*/api/admin/categories', async ({ request }) => {
      payload = await request.json();
      created = true;
      return HttpResponse.json({ id: 10 });
    }),
    http.delete('*/api/admin/categories/10', () =>
      HttpResponse.json({ code: 'DATA_CONFLICT' }, { status: 409 }),
    ),
  );
  renderApp(<CategoriesPanel />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Tên danh mục'), 'Ngũ cốc');
  await user.type(screen.getByLabelText('Slug'), 'ngu-coc');
  await user.click(screen.getByRole('button', { name: 'Tạo danh mục' }));
  await screen.findByRole('button', { name: 'Xóa Ngũ cốc' });
  expect(payload).toEqual({ name: 'Ngũ cốc', slug: 'ngu-coc' });
  await user.click(screen.getByRole('button', { name: 'Xóa Ngũ cốc' }));
  expect(confirmation).toHaveBeenCalledWith(
    expect.stringContaining('Xóa danh mục'),
  );
  await screen.findByRole('alert');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Xóa Ngũ cốc' })).toBeEnabled(),
  );
  confirmation.mockRestore();
});
