import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { PromoStrip } from '../layout/promo-strip';

it('reads each fact once and can be paused', async () => {
  render(<PromoStrip />);
  const strip = screen.getByRole('region', {
    name: 'Điểm nổi bật của cửa hàng',
  });
  // The second row only exists for the seamless loop and is hidden from assistive tech.
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
  expect(screen.getAllByText(/9 nhóm chất gây dị ứng/)).toHaveLength(2);

  const toggle = screen.getByRole('button', { name: 'Tạm dừng dải thông tin' });
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await userEvent.click(toggle);
  expect(
    screen.getByRole('button', { name: 'Chạy lại dải thông tin' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(strip).toHaveAttribute('data-paused', 'true');
});

it('promises nothing the shop does not offer', () => {
  render(<PromoStrip />);
  expect(screen.queryByText(/miễn phí giao|giảm/i)).not.toBeInTheDocument();
});
