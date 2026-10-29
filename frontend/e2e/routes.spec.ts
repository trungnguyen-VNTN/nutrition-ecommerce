import { expect, test } from '@playwright/test';
import { pages } from './pages';

for (const width of [390, 1440]) {
  for (const route of pages) {
    test(`${route.name} renders without horizontal scrolling at ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(route.path);
      await expect(
        page.getByRole('heading', { level: 1, name: route.title, exact: true }),
      ).toBeVisible();
      if (route.path === '/products')
        await expect(page.getByRole('article')).toHaveCount(8);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    });
  }
}

test('keyboard users can skip navigation and open a product', async ({
  page,
}) => {
  await page.goto('/products');
  await expect(page.getByRole('article')).toHaveCount(8);
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Đến nội dung chính' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.keyboard.press('Tab');
  const product = page.getByRole('link', { name: 'Yến mạch nguyên hạt' });
  await expect(product).toBeFocused();
  expect(
    await product.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Chi tiết sản phẩm' }),
  ).toBeVisible();
  await expect(page.getByRole('main')).toBeFocused();
});
