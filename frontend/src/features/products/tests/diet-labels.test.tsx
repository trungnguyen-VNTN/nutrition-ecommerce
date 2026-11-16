import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { messages } from '@/app/messages.vi';
import { DietLabelTags } from '@/components/diet-label-tags';
import { productPage, products } from '@/mocks/products';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';
import { filtersSchema, productQuery } from '../api/filters';
import { productSchema } from '../api/products';
import { ProductsPage } from '../products-page';

describe('diet labels', () => {
  it('sends label filters and rejects unknown ones', () => {
    expect(
      productQuery(filtersSchema.parse({ label: ['LOW_SUGAR', 'HIGH_FIBER'] })),
    ).toBe('page=0&size=9&label=LOW_SUGAR&label=HIGH_FIBER');
    expect(filtersSchema.safeParse({ label: ['KETO'] }).success).toBe(false);
  });

  it('drops label codes the UI does not know instead of showing raw codes', () => {
    const [first] = products;
    const parsed = productSchema.parse({
      ...first,
      diet_labels: ['LOW_FAT', 'SOMETHING_NEW'],
    });
    expect(parsed.diet_labels).toEqual(['LOW_FAT']);
  });

  it('shows at most two labels on a card and names the rest', () => {
    renderApp(
      <DietLabelTags
        labels={['HIGH_PROTEIN', 'LOW_FAT', 'LOW_SODIUM', 'PLANT_BASED']}
        max={2}
      />,
    );
    expect(screen.getByText('Giàu protein')).toBeVisible();
    expect(screen.getByText('Ít chất béo')).toBeVisible();
    expect(screen.queryByText('Ít natri')).not.toBeInTheDocument();
    expect(
      screen.getByText(/: Ít natri, Thuần thực vật/, { selector: 'span' }),
    ).toBeInTheDocument();
  });

  it('filters by a label from the filter panel and shows it as a chip', async () => {
    const user = userEvent.setup();
    const requests: string[] = [];
    server.use(
      http.get('*/api/products', ({ request }) => {
        requests.push(new URL(request.url).search);
        return HttpResponse.json(productPage);
      }),
    );
    renderApp(<ProductsPage />);
    await user.click(screen.getByRole('button', { name: /^Bộ lọc/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Ít đường' }));
    await user.click(
      screen.getByRole('button', { name: messages.applyFilters }),
    );
    await waitFor(() => expect(requests.at(-1)).toContain('label=LOW_SUGAR'));
    expect(
      screen.getByRole('button', { name: 'Bỏ lọc Ít đường' }),
    ).toBeVisible();
  });
});
