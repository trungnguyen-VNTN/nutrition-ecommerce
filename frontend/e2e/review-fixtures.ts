import type { Page } from '@playwright/test';
import { products, productPage } from '../src/mocks/products';

// Browser-only fixtures. Never imported by application code or the production build.
export async function installReviewFixtures(page: Page, signedIn = true) {
  // This fixture suite owns all API requests through Playwright routing.
  // Avoid starting the separate MSW harness used by the other E2E suites.
  await page.route('**/src/mocks/browser.ts*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'export async function startMocks() {}',
    }),
  );
  await page.route('**/src/features/auth/session.ts*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `const identity=${signedIn ? "{sub:'review-only',email:'review@example.invalid',admin:true}" : 'null'}; export const useSession=()=>identity; export const authConfigured=true; export const accessToken=async()=>null; export const signOut=()=>{}; export const signIn=async()=>{}; export const signUp=async()=>{}; export const confirmEmail=async()=>{};`,
    }),
  );
  await page.route('http://127.0.0.1:5173/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const cart = {
      items: [
        {
          product_id: 1,
          name: products[0]!.name,
          price: 35000,
          currency: 'VND',
          quantity: 2,
          stock: 12,
          active: true,
        },
      ],
      total: 70000,
    };
    const order = {
      id: 12,
      status: 'PLACED',
      total: 70000,
      currency: 'VND',
      created_at: '2026-10-31T08:00:00Z',
      shipping_name: 'Khách kiểm thử',
      phone: '0900000000',
      address: 'Địa chỉ kiểm thử giao diện',
      items: [
        {
          product_id: 1,
          name_snapshot: products[0]!.name,
          unit_price: 35000,
          quantity: 2,
        },
      ],
    };
    let data: unknown;
    if (path === '/api/categories')
      data = [
        { id: 1, name: 'Ngũ cốc', slug: 'ngu-coc' },
        { id: 2, name: 'Các loại hạt', slug: 'hat' },
      ];
    else if (path === '/api/products') data = productPage;
    else if (path.startsWith('/api/products/'))
      data =
        products.find((p) => p.id === path.split('/').pop()) ?? products[0];
    else if (path === '/api/cart') data = cart;
    else if (path === '/api/orders') data = [order];
    else if (path.startsWith('/api/orders/')) data = order;
    else if (path === '/api/chat')
      data = {
        reply: 'Kết quả tra cứu từ dữ liệu kiểm thử giao diện.',
        products: products.slice(0, 2),
      };
    else if (path === '/api/admin/products')
      data = products
        .slice(0, 3)
        .map((p, i) => ({ ...p, id: i + 1, category_id: 1, active: true }));
    else if (path === '/api/admin/orders') data = [order];
    else if (path.startsWith('/api/admin/orders/')) data = order;
    else if (path.endsWith('/data'))
      data = {
        ...products[0],
        available_allergens: [{ code: 'peanut', name: 'Đậu phộng' }],
      };
    else {
      await route.fulfill({
        status: 404,
        json: { code: 'NOT_FOUND', message: 'No review fixture' },
      });
      return;
    }
    await route.fulfill({ json: data });
  });
}
