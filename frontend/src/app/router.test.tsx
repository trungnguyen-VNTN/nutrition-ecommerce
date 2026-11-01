import { screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderApp } from '@/test/render';
import { AppRoutes } from './router';
import { messages } from './messages.vi';

it.each([
  ['/', 'Hiểu thực phẩm.Chọn điều phù hợp.'],
  ['/products', messages.products],
  ['/products/oats', 'Yến mạch nguyên hạt'],
  ['/cart', messages.cart],
  ['/orders', messages.orders],
  ['/login', messages.login],
  ['/chat', messages.chat],
  ['/admin', messages.admin],
  ['/unknown', messages.notFound],
])('renders the heading at %s', async (path, title) => {
  renderApp(<AppRoutes />, path);
  expect(
    await screen.findByRole('heading', { level: 1, name: title }),
  ).toBeVisible();
  expect(
    screen.getByRole('navigation', { name: messages.navigation }),
  ).toBeVisible();
  expect(screen.getByRole('contentinfo')).toBeVisible();
});
