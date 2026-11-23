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

test('production serves the favicon, app icons and manifest but not the mock worker', async ({
  request,
}) => {
  for (const [path, type] of [
    ['/favicon.svg', 'image/svg+xml'],
    ['/favicon-32.png', 'image/png'],
    ['/apple-touch-icon.png', 'image/png'],
    ['/icon-192.png', 'image/png'],
    ['/icon-512.png', 'image/png'],
    ['/manifest.webmanifest', 'application/manifest+json'],
  ] as const) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toContain(type);
  }
  const worker = await request.get('/mockServiceWorker.js');
  expect(await worker.text()).not.toContain('Mock Service Worker');
});
