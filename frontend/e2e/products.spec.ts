import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`loading preserves the first card geometry at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/products?mock=loading');
    const skeleton = page.getByTestId('product-skeleton').first();
    await expect(skeleton).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const loadingBox = await skeleton.boundingBox();
    await page.goto('/products');
    await expect(page.getByRole('article')).toHaveCount(8);
    await page.evaluate(() => document.fonts.ready);
    const loadedBox = await page.getByRole('article').first().boundingBox();
    expect(loadingBox).not.toBeNull();
    expect(loadedBox).not.toBeNull();
    for (const dimension of ['x', 'y', 'width', 'height'] as const) {
      expect(loadedBox?.[dimension]).toBeCloseTo(
        loadingBox?.[dimension] ?? -1,
        0,
      );
    }
  });
}

test('missing product data is explicit', async ({ page }) => {
  await page.goto('/products');
  await expect(page.getByRole('article')).toHaveCount(8);
  await expect(
    page.getByText('Chưa có dữ liệu dinh dưỡng', { exact: true }),
  ).toHaveCount(3);
  await expect(
    page.getByText('Chưa xác minh allergen', { exact: true }),
  ).toHaveCount(3);
});

test('retry recovers after a failed request', async ({ page }) => {
  await page.goto('/products?mock=error');
  await expect(page.getByRole('alert')).toBeVisible();
  // Restore the mock service only after the error is visible; StrictMode can
  // issue multiple initial requests, so request counts do not model recovery.
  await page.evaluate(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('mock');
    window.history.replaceState(null, '', url);
  });
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByRole('article')).toHaveCount(8);
});

test('empty and loading states have clear accessible labels', async ({
  page,
}) => {
  await page.goto('/products?mock=empty');
  await expect(
    page.getByRole('heading', { name: 'Chưa có sản phẩm' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Tải lại danh sách' }),
  ).toBeVisible();
  await page.goto('/products?mock=loading');
  await expect(page.getByRole('status')).toHaveText('Đang tải sản phẩm');
  await expect(page.getByTestId('product-skeleton')).toHaveCount(8);
});
