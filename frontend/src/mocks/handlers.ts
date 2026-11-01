import { delay, http, HttpResponse } from 'msw';
import type { ApiErrorBody } from '@/lib/api/catalog.types';
import { productPage, products } from './products';

export function createHandlers(getScenario: () => string | null = () => null) {
  return [
    http.get('*/api/categories', () =>
      HttpResponse.json([{ id: 1, name: 'Ngũ cốc', slug: 'ngu-coc' }]),
    ),
    http.get('*/api/products/:id', ({ params }) => {
      const product = products.find((p) => p.id === params.id);
      return product
        ? HttpResponse.json(product)
        : HttpResponse.json(
            { code: 'NOT_FOUND', message: 'Not found', details: {} },
            { status: 404 },
          );
    }),
    http.get('*/api/products', async () => {
      const scenario = getScenario();
      if (scenario === 'loading') await delay('infinite');
      if (scenario === 'error') {
        return HttpResponse.json<ApiErrorBody>(
          { code: 'SERVICE_UNAVAILABLE', message: 'Mock service unavailable' },
          { status: 503 },
        );
      }
      if (scenario === 'empty')
        return HttpResponse.json({ ...productPage, items: [], total: 0 });
      return HttpResponse.json(productPage);
    }),
  ];
}
