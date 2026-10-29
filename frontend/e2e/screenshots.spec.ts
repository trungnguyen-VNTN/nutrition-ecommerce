import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { pages } from './pages';

const captures = [
  ...pages,
  {
    path: '/products?mock=loading',
    name: 'products-loading',
    title: 'Sản phẩm',
  },
  { path: '/products?mock=empty', name: 'products-empty', title: 'Sản phẩm' },
  { path: '/products?mock=error', name: 'products-error', title: 'Sản phẩm' },
];

for (const width of [390, 1440]) {
  for (const route of captures) {
    test(`${route.name}-${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(route.path);
      await expect(
        page.getByRole('heading', { level: 1, name: route.title, exact: true }),
      ).toBeVisible();
      if (route.name === 'products')
        await expect(page.getByRole('article')).toHaveCount(8);
      if (route.name === 'products-loading')
        await expect(page.getByTestId('product-skeleton')).toHaveCount(8);
      if (route.name === 'products-empty')
        await expect(
          page.getByRole('heading', { name: 'Chưa có sản phẩm' }),
        ).toBeVisible();
      if (route.name === 'products-error')
        await expect(page.getByRole('alert')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const directory = join(process.cwd(), '.screenshots');
      await mkdir(directory, { recursive: true });
      await page.screenshot({
        path: join(directory, `${route.name}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
}
