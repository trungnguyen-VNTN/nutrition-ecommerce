import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { PromoStrip } from '../layout/promo-strip';

const renderStrip = () =>
  render(
    <MemoryRouter>
      <PromoStrip />
    </MemoryRouter>,
  );

it('reads each fact once, links it, and can be paused', async () => {
  renderStrip();
  const strip = screen.getByRole('region', {
    name: 'Điểm nổi bật của cửa hàng',
  });
  // The second row only exists for the seamless loop: hidden from assistive tech
  // and out of the tab order.
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
  expect(screen.getAllByText(/nhóm chất gây dị ứng/)).toHaveLength(2);
  const links = screen.getAllByRole('link');
  expect(links).toHaveLength(5);
  expect(
    screen.getByRole('link', { name: /phân tích bữa ăn/i }),
  ).toHaveAttribute('href', '/meal-analyzer');
  const hiddenLinks = strip.querySelectorAll('[aria-hidden="true"] a');
  expect(hiddenLinks).toHaveLength(5);
  hiddenLinks.forEach((link) => expect(link).toHaveAttribute('tabindex', '-1'));

  const toggle = screen.getByRole('button', { name: 'Tạm dừng dải thông tin' });
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await userEvent.click(toggle);
  expect(
    screen.getByRole('button', { name: 'Chạy lại dải thông tin' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(strip).toHaveAttribute('data-paused', 'true');
});

it('promises nothing the shop does not offer', () => {
  renderStrip();
  expect(screen.queryByText(/miễn phí giao|giảm/i)).not.toBeInTheDocument();
});
