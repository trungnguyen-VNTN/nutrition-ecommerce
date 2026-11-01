import { expect, test } from '@playwright/test';
import { productPage } from '../src/mocks/products';

test('production calls the API without loading mocks or registering a worker', async ({
  page,
  context,
}) => {
  const mockRequests: string[] = [];
  context.on('request', (request) => {
    if (/mockServiceWorker|\/mocks\//.test(new URL(request.url()).pathname))
      mockRequests.push(request.url());
  });
  await page.route('**/api/categories', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/products?*', (route) =>
    route.fulfill({ json: productPage }),
  );
  const request = page.waitForRequest('**/api/products?*');
  await page.goto('/products?mock=error');
  await request;
  await expect(page.getByRole('article')).toHaveCount(8);
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);
  expect(context.serviceWorkers()).toHaveLength(0);
  expect(mockRequests).toEqual([]);
});
