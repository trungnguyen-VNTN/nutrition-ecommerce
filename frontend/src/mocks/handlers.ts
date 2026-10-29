import { delay, http, HttpResponse } from 'msw';
import type { ApiErrorBody } from '@/lib/api/catalog.types';
import { productPage } from './products';

export function createHandlers(getScenario: () => string | null = () => null) {
  return [
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
