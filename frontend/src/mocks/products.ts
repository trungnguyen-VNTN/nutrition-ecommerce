import type { Product, ProductPage } from '@/lib/api/catalog.types';

const fixtures = [
  {
    id: 'oats',
    name: 'Yến mạch nguyên hạt',
    price: 68000,
    currency: 'VND',
    stock: 24,
    nutrition_complete: true,
    allergens_verified: true,
  },
  {
    id: 'almonds',
    name: 'Hạnh nhân rang mộc',
    price: 125000,
    currency: 'VND',
    stock: 12,
    nutrition_complete: true,
    allergens_verified: true,
  },
  {
    id: 'brown-rice',
    name: 'Gạo lứt nguyên cám',
    price: 52000,
    currency: 'VND',
    stock: 18,
    nutrition_complete: false,
    allergens_verified: true,
  },
  {
    id: 'chia',
    name: 'Hạt chia',
    price: 89000,
    currency: 'VND',
    stock: 8,
    nutrition_complete: true,
    allergens_verified: false,
  },
  {
    id: 'granola',
    name: 'Ngũ cốc granola',
    price: 115000,
    currency: 'VND',
    stock: 0,
    nutrition_complete: false,
    allergens_verified: false,
  },
  {
    id: 'lentils',
    name: 'Đậu lăng đỏ',
    price: 74000,
    currency: 'VND',
    stock: 15,
    nutrition_complete: true,
    allergens_verified: true,
  },
  {
    id: 'pumpkin-seeds',
    name: 'Hạt bí rang mộc',
    price: 96000,
    currency: 'VND',
    stock: 9,
    nutrition_complete: false,
    allergens_verified: true,
  },
  {
    id: 'quinoa',
    name: 'Hạt diêm mạch',
    price: 138000,
    currency: 'VND',
    stock: 11,
    nutrition_complete: true,
    allergens_verified: false,
  },
];

export const products: Product[] = fixtures.map((p) => ({
  ...p,
  description: 'Sản phẩm mẫu dành cho kiểm thử.',
  category: { id: 1, name: 'Ngũ cốc', slug: 'ngu-coc' },
  serving_size: p.nutrition_complete ? 100 : null,
  serving_unit: p.nutrition_complete ? 'g' : null,
  nutrition: p.nutrition_complete
    ? {
        calories: 200,
        protein_g: 10,
        carbs_g: 20,
        fat_g: 5,
        sugar_g: null,
        fiber_g: 4,
        sodium_mg: null,
        source: 'test-fixture',
      }
    : null,
  allergens: p.allergens_verified ? [] : null,
}));
export const productPage: ProductPage = {
  items: products,
  page: 0,
  size: 8,
  total: products.length,
};
