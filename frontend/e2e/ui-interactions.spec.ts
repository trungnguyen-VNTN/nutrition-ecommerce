import { expect, test } from '@playwright/test';
import { installReviewFixtures } from './review-fixtures';

test.use({ serviceWorkers: 'block' });
test('header search and filter chips preserve remaining filters', async ({
  page,
}) => {
  await installReviewFixtures(page, false);
  await page.goto('/');
  await page
    .getByRole('searchbox', { name: 'Tìm trong cửa hàng' })
    .fill('yến mạch');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(page).toHaveURL(/q=y%E1%BA%BFn\+m%E1%BA%A1ch/);
  await page.getByRole('checkbox', { name: 'Đậu phộng', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Sữa', exact: true }).check();
  await page.getByRole('button', { name: 'Áp dụng', exact: true }).click();
  await page
    .getByRole('button', { name: 'Bỏ lọc Đậu phộng', exact: true })
    .click();
  const url = new URL(page.url());
  expect(url.searchParams.getAll('excludeAllergen')).toEqual(['milk']);
  expect(url.searchParams.get('q')).toBe('yến mạch');
  await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
});

test('cart quantity updates shared indicator and checkout opens the created order', async ({
  page,
}) => {
  await installReviewFixtures(page);
  await page.route('**/api/cart/items/1', async (route) => {
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().postDataJSON()).toEqual({ quantity: 3 });
    await route.fulfill({
      json: {
        items: [
          {
            product_id: 1,
            name: 'Yến mạch nguyên hạt',
            price: 35000,
            currency: 'VND',
            quantity: 3,
            stock: 12,
            active: true,
          },
        ],
        total: 105000,
      },
    });
  });
  await page.route('**/api/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    expect(route.request().headers()['idempotency-key']).toMatch(
      /^[\da-f-]{36}$/,
    );
    expect(route.request().postDataJSON()).toEqual({
      shipping_name: 'Khách kiểm thử',
      phone: '0900000000',
      address: 'Địa chỉ kiểm thử giao diện',
    });
    await route.fulfill({
      json: {
        id: 12,
        status: 'PLACED',
        total: 105000,
        currency: 'VND',
        created_at: '2026-10-31T08:00:00Z',
        shipping_name: 'Khách kiểm thử',
        phone: '0900000000',
        address: 'Địa chỉ kiểm thử giao diện',
        items: [
          {
            product_id: 1,
            name_snapshot: 'Yến mạch nguyên hạt',
            unit_price: 35000,
            quantity: 3,
          },
        ],
      },
    });
  });
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Tăng Yến mạch nguyên hạt' }).click();
  await expect(page.getByLabel('3 sản phẩm trong giỏ')).toBeVisible();
  await page.getByRole('link', { name: 'Tiếp tục đặt hàng' }).click();
  await page.getByLabel('Người nhận').fill('Khách kiểm thử');
  await page.getByLabel('Số điện thoại').fill('0900000000');
  await page
    .getByLabel('Địa chỉ', { exact: true })
    .fill('Địa chỉ kiểm thử giao diện');
  await page.getByRole('button', { name: 'Xác nhận đặt hàng' }).click();
  await expect(page).toHaveURL(/\/orders\/12$/);
  await expect(
    page.getByText('Địa chỉ kiểm thử giao diện', { exact: true }),
  ).toBeVisible();
});

test('admin can filter products and cancel hiding without sending a mutation', async ({
  page,
}) => {
  await installReviewFixtures(page);
  let mutations = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/admin/') && request.method() !== 'GET')
      mutations++;
  });
  await page.goto('/admin');
  await page.getByLabel('Tìm tên trong trang hiện tại').fill('Yến mạch');
  await expect(
    page.getByRole('heading', { name: 'Hạnh nhân rang mộc', exact: true }),
  ).toHaveCount(0);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Ẩn', exact: true }).click();
  expect(mutations).toBe(0);
  await expect(
    page.getByRole('heading', { name: 'Yến mạch nguyên hạt', exact: true }),
  ).toBeVisible();
});
