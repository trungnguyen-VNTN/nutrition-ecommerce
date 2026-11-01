import { expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';
import { ChatPage } from './chat-page';

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({ sub: 'test-sub' }),
  accessToken: async () => null,
  signOut: vi.fn(),
}));

it('uses suggestions as editable input and retries the actual question without inventing a reply', async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post('*/api/chat', async ({ request }) => {
      bodies.push(await request.json());
      return bodies.length === 1
        ? HttpResponse.json({ code: 'UNAVAILABLE' }, { status: 503 })
        : HttpResponse.json({
            reply: 'Không tìm thấy sản phẩm phù hợp.',
            products: [],
          });
    }),
  );
  renderApp(<ChatPage />, '/chat');
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Tìm yến mạch' }));
  const input = screen.getByLabelText('Bạn muốn tìm thực phẩm nào?');
  expect(input).toHaveValue('Tìm yến mạch');
  expect(input).toHaveFocus();
  expect(bodies).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: 'Tra cứu' }));
  await screen.findByRole('alert');
  await user.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(
    await screen.findByText('Không tìm thấy sản phẩm phù hợp.'),
  ).toBeVisible();
  expect(bodies).toEqual([
    { message: 'Tìm yến mạch' },
    { message: 'Tìm yến mạch' },
  ]);
  expect(
    screen.getByText('Thông tin tham khảo, không phải tư vấn y tế'),
  ).toBeVisible();
});
