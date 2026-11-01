import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { messages } from '@/app/messages.vi';
import { productPage } from '@/mocks/products';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';
import { ProductsPage } from '../products-page';

describe('mock catalog', () => {
  it('shows skeletons while waiting for data', () => {
    server.use(
      http.get('*/api/products', async () => {
        await delay('infinite');
        return HttpResponse.json(productPage);
      }),
    );
    renderApp(<ProductsPage />);
    expect(screen.getByRole('status')).toHaveTextContent(messages.loading);
    expect(screen.getAllByTestId('product-skeleton')).toHaveLength(8);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('renders eight products and explicitly labels missing data', async () => {
    renderApp(<ProductsPage />);
    expect(await screen.findAllByRole('article')).toHaveLength(8);
    expect(screen.getAllByText(messages.nutritionMissing)).toHaveLength(3);
    expect(screen.getAllByText(messages.allergensMissing)).toHaveLength(3);
    expect(screen.getByText(messages.sampleNotice)).toBeVisible();
  });

  it('can reload from an empty response', async () => {
    server.use(
      http.get('*/api/products', () =>
        HttpResponse.json({ ...productPage, items: [], total: 0 }),
      ),
    );
    renderApp(<ProductsPage />);
    expect(
      await screen.findByRole('heading', { name: messages.emptyTitle }),
    ).toBeVisible();
    server.resetHandlers();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: messages.refresh }));
    expect(await screen.findAllByRole('article')).toHaveLength(8);
  });

  it('can retry a server error without exposing its internal message', async () => {
    server.use(
      http.get('*/api/products', () =>
        HttpResponse.json(
          { code: 'INTERNAL', message: 'private table details' },
          { status: 500 },
        ),
      ),
    );
    renderApp(<ProductsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      messages.apiErrors.unavailable,
    );
    expect(screen.queryByText('private table details')).not.toBeInTheDocument();
    server.resetHandlers();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: messages.retry }));
    expect(await screen.findAllByRole('article')).toHaveLength(8);
  });

  it('rejects malformed data rather than inventing missing values', async () => {
    server.use(
      http.get('*/api/products', () =>
        HttpResponse.json({ items: [{ name: 'Invalid' }] }),
      ),
    );
    renderApp(<ProductsPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('handles a network failure', async () => {
    server.use(http.get('*/api/products', () => HttpResponse.error()));
    renderApp(<ProductsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      messages.apiErrors.unavailable,
    );
  });
});
