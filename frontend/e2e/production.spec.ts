import { expect, test } from '@playwright/test';

test('production starts no worker, loads no mocks, and calls no API', async ({
  page,
  context,
}) => {
  const forbiddenRequests: string[] = [];
  context.on('request', (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.startsWith('/api/') ||
      /mockServiceWorker|\/mocks\//.test(url.pathname)
    )
      forbiddenRequests.push(url.pathname);
  });
  await page.goto('/products?mock=error');
  await expect(
    page.getByRole('heading', {
      name: 'Danh sách sản phẩm đang được chuẩn bị',
    }),
  ).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);
  expect(context.serviceWorkers()).toHaveLength(0);
  expect(forbiddenRequests).toEqual([]);
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(
    page.getByText('Dữ liệu mẫu để kiểm thử giao diện;', { exact: false }),
  ).toHaveCount(0);
});
