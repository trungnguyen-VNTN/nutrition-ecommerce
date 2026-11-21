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
    else if (path === '/api/me/profile')
      data = {
        birth_year: 1995,
        sex: 'MALE',
        height_cm: 180,
        weight_kg: 80,
        activity: 'MODERATE',
        goal: 'MAINTAIN',
        excluded_allergens: ['milk'],
        pregnant_or_breastfeeding: false,
        medical_condition: false,
        updated_at: '2026-11-21T08:00:00Z',
      };
    else if (path === '/api/me/targets')
      data = {
        eligible: true,
        ineligible: null,
        age: 31,
        bmi: 24.7,
        resting_calories: 1780,
        daily_calories: 2760,
        calories: 2760,
        protein_g: 80,
        carbs_g: 403,
        fat_g: 92,
      };
    else if (path === '/api/me/recommendations') {
      const n = (
        calories: number,
        protein_g: number,
        carbs_g: number,
        fat_g: number,
      ) => ({
        calories,
        protein_g,
        carbs_g,
        fat_g,
      });
      data = {
        eligible: true,
        ineligible: null,
        meal:
          new URL(route.request().url()).searchParams.get('meal') ?? 'LUNCH',
        target: n(1035, 30, 151, 35),
        items: [
          {
            product: { id: products[0]!.id, name: products[0]!.name },
            grams: 120,
            role: 'protein',
            amounts: n(198, 24.5, 4.1, 6.2),
          },
          {
            product: { id: products[1]!.id, name: products[1]!.name },
            grams: 150,
            role: 'rau, trái cây',
            amounts: n(51, 4.2, 9.9, 0.6),
          },
          {
            product: { id: products[2]!.id, name: products[2]!.name },
            grams: 200,
            role: 'tinh bột',
            amounts: n(740, 15.8, 154, 5.8),
          },
        ],
        total: n(989, 44.5, 168, 12.6),
        calories_pct: 96,
        protein_pct: 148,
      };
    } else if (path === '/api/orders') data = [order];
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
    else if (path === '/api/admin/payments/events')
      data = {
        items: [
          {
            id: 3,
            received_at: '2026-11-20T11:05:00Z',
            txn_ref: '12NABCD2345',
            order_id: 12,
            signature_valid: true,
            gateway_code: '00',
            rsp_code: '00',
            outcome: 'PAID',
          },
          {
            id: 2,
            received_at: '2026-11-20T11:02:00Z',
            txn_ref: '12NABCD2345',
            order_id: 12,
            signature_valid: true,
            gateway_code: '00',
            rsp_code: '02',
            outcome: 'DUPLICATE',
          },
          {
            id: 1,
            received_at: '2026-11-20T11:00:00Z',
            txn_ref: 'FORGED1',
            order_id: null,
            signature_valid: false,
            gateway_code: null,
            rsp_code: '97',
            outcome: 'INVALID_SIGNATURE',
          },
        ],
        total: 3,
        page: 0,
        size: 20,
      };
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
