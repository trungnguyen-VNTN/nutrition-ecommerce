import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { pages } from './pages';

for (const width of [390, 1440]) {
  for (const path of [
    ...pages.map((page) => page.path),
    '/products?mock=loading',
    '/products?mock=empty',
    '/products?mock=error',
  ]) {
    test(`axe ${path} at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (path === '/products')
        await expect(page.getByRole('article')).toHaveCount(8);
      if (path.includes('mock=loading'))
        await expect(page.getByTestId('product-skeleton')).toHaveCount(8);
      if (path.includes('mock=empty'))
        await expect(
          page.getByRole('heading', { name: 'Chưa có sản phẩm' }),
        ).toBeVisible();
      if (path.includes('mock=error'))
        await expect(page.getByRole('alert')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        results.violations.filter((violation) =>
          ['serious', 'critical'].includes(violation.impact ?? ''),
        ),
        JSON.stringify(results.violations, null, 2),
      ).toEqual([]);
    });
  }
}
