import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { messages } from '@/app/messages.vi';
import { products } from '@/mocks/products';
import { renderApp } from '@/test/render';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { EmptyState } from '../empty-state';
import { ErrorState } from '../error-state';
import { DataStatusBadge } from '../data-status-badge';
import { ProductCard } from '../product-card';

describe('shared components', () => {
  it('runs button actions and prevents actions while loading or disabled', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    const { rerender } = render(<Button onClick={action}>Tiếp tục</Button>);
    await user.click(screen.getByRole('button'));
    expect(action).toHaveBeenCalledTimes(1);
    rerender(
      <Button loading onClick={action}>
        Tiếp tục
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    await user.click(screen.getByRole('button'));
    rerender(
      <Button disabled onClick={action}>
        Tiếp tục
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('keeps visual skeletons out of the accessibility tree', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('allows reloading an empty list', async () => {
    const refresh = vi.fn();
    render(<EmptyState onRefresh={refresh} />);
    expect(
      screen.getByRole('heading', { name: messages.emptyTitle }),
    ).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: messages.refresh }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('announces errors and offers a retry', async () => {
    const retry = vi.fn();
    render(
      <ErrorState
        description={messages.apiErrors.unavailable}
        onRetry={retry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      messages.apiErrors.unavailable,
    );
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: messages.retry }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it.each(['nutrition', 'allergens'] as const)(
    'labels missing %s data in text',
    (kind) => {
      render(<DataStatusBadge kind={kind} />);
      expect(
        screen.getByText(
          kind === 'nutrition'
            ? messages.nutritionMissing
            : messages.allergensMissing,
        ),
      ).toBeVisible();
    },
  );

  it('shows both missing-data labels and a descriptive product link', () => {
    const product = products.find((item) => item.id === 'granola');
    if (!product) throw new Error('Missing fixture');
    renderApp(<ProductCard product={product} index={0} />);
    expect(screen.getByText(messages.nutritionMissing)).toBeVisible();
    expect(screen.getByText(messages.allergensMissing)).toBeVisible();
    expect(
      screen.queryByText(messages.nutritionVerified),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(messages.allergensVerified),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: product.name })).toHaveAttribute(
      'href',
      '/products/granola',
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(
      messages.illustration(product.name),
    );
    expect(screen.getByText(messages.outOfStock)).toBeVisible();
  });
});
