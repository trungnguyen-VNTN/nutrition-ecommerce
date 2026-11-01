import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installReviewFixtures } from './review-fixtures';
import { productPage } from '../src/mocks/products';

test.use({ serviceWorkers: 'block' });
for (const width of [390, 768, 1440]) {
  for (const [name, path] of [
    ['home', '/'],
    ['products', '/products'],
    ['products-loading', '/products?review=loading'],
    ['products-empty', '/products?review=empty'],
    ['products-error', '/products?review=error'],
    ['product-detail', '/products/oats'],
    ['cart', '/cart'],
    ['checkout', '/checkout'],
    ['orders', '/orders'],
    ['order-detail', '/orders/12'],
    ['login', '/login'],
    ['register', '/register'],
    ['chat', '/chat'],
    ['admin', '/admin'],
    ['admin-nutrition', '/admin/products/1'],
  ] as const) {
    test(`V2 UI review ${name} ${width}`, async ({ page }) => {
      const browserErrors: string[] = [];
      page.on('pageerror', (error) => browserErrors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await installReviewFixtures(
        page,
        name !== 'login' && name !== 'register',
      );
      if (name.startsWith('products-')) {
        await page.route(
          'http://127.0.0.1:5173/api/products?*',
          async (route) => {
            // Intentionally leave only the loading fixture request pending.
            if (name === 'products-loading') return;
            if (name === 'products-error')
              await route.fulfill({
                status: 503,
                json: { code: 'UNAVAILABLE' },
              });
            else
              await route.fulfill({
                json: { ...productPage, items: [], total: 0 },
              });
          },
        );
      }
      const directory = join(process.cwd(), '.screenshots', 'v2');
      await mkdir(directory, { recursive: true });

      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (name === 'home' || name === 'products')
        await expect(page.getByRole('article').first()).toBeVisible();
      if (name === 'products-loading')
        await expect(page.getByTestId('product-skeleton')).toHaveCount(8);
      if (name === 'products-empty')
        await expect(
          page.getByRole('heading', { name: 'Chưa có sản phẩm' }),
        ).toBeVisible();
      if (name === 'products-error')
        await expect(page.getByRole('alert')).toBeVisible();
      if (name === 'cart')
        await expect(
          page.getByText('70.000', { exact: false }).first(),
        ).toBeVisible();
      if (name === 'admin')
        await expect(
          page.getByText('Yến mạch nguyên hạt', { exact: true }),
        ).toBeVisible();
      if (name === 'admin-nutrition')
        await expect(page.getByLabel('Nguồn dữ liệu')).toBeVisible();
      if (name === 'chat') {
        await page
          .getByRole('button', { name: 'Tìm yến mạch', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Tra cứu', exact: true })
          .click();
        await expect(page.getByRole('article').first()).toBeVisible();
      }
      await page.evaluate(() => document.fonts.ready);
      if (name === 'home')
        await page
          .getByRole('img', { name: /Bát ngũ cốc/ })
          .evaluate(async (image) => {
            await (image as HTMLImageElement).decode();
          });
      expect(browserErrors).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name} overflow`,
      ).toBe(true);
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        axe.violations.filter((v) =>
          ['serious', 'critical'].includes(v.impact ?? ''),
        ),
        `${name}: ${JSON.stringify(axe.violations)}`,
      ).toEqual([]);
      await page.screenshot({
        path: join(directory, `${name}-${width}-fixture.png`),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
}
