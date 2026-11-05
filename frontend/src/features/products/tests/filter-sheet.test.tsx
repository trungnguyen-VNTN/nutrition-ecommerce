import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { messages } from '@/app/messages.vi';
import { productPage } from '@/mocks/products';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';
import { ProductsPage } from '../products-page';

describe('filter bottom sheet', () => {
  it('opens as a modal, moves focus in and returns it on Escape', async () => {
    const user = userEvent.setup();
    renderApp(<ProductsPage />);
    const toggle = screen.getByRole('button', { name: /^Bộ lọc/ });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(toggle);
    const sheet = screen.getByRole('dialog', { name: messages.filters });
    expect(sheet).toHaveAttribute('aria-modal', 'true');
    expect(
      screen.getByRole('button', { name: messages.closeFilters }),
    ).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it('closes after applying and keeps the chosen filter in the URL state', async () => {
    const user = userEvent.setup();
    renderApp(<ProductsPage />);
    await user.click(screen.getByRole('button', { name: /^Bộ lọc/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Sữa' }));
    await user.click(
      screen.getByRole('button', { name: messages.applyFilters }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Bỏ lọc Sữa' })).toBeVisible();
  });

  it('offers to clear filters when they match nothing', async () => {
    server.use(
      http.get('*/api/products', () =>
        HttpResponse.json({ ...productPage, items: [], total: 0 }),
      ),
    );
    renderApp(<ProductsPage />, '/products?minProtein=99');
    expect(await screen.findByText(messages.filteredEmpty)).toBeVisible();
    expect(
      screen.getByRole('button', { name: messages.clearAllFilters }),
    ).toBeVisible();
  });
});
