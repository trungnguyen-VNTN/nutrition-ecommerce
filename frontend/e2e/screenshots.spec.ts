import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`product-detail-${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/products/1');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Yến mạch nguyên hạt',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const directory = join(process.cwd(), '.screenshots');
    await mkdir(directory, { recursive: true });
    await page.screenshot({
      path: join(directory, `product-detail-${width}.png`),
      fullPage: true,
      animations: 'disabled',
    });
  });
}
