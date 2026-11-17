import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { BannerCarousel, bannerInterval } from './banner-carousel';
import { Collections } from './collections';

const activeSlide = () =>
  screen
    .getAllByRole('group', { hidden: true })
    .find((slide) => slide.getAttribute('aria-hidden') === 'false');

describe('BannerCarousel', () => {
  afterEach(() => vi.useRealTimers());

  it('rotates, keeps hidden slides inert and stops on the pause button', () => {
    vi.useFakeTimers();
    renderApp(<BannerCarousel />);
    expect(activeSlide()).toHaveAccessibleName('1 / 3: Giàu protein');
    const hidden = screen
      .getAllByRole('group', { hidden: true })
      .filter((slide) => slide !== activeSlide());
    for (const slide of hidden) expect(slide).toHaveAttribute('inert');

    act(() => vi.advanceTimersByTime(bannerInterval));
    expect(activeSlide()).toHaveAccessibleName('2 / 3: Hạt & đậu');

    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng banner' }));
    // The click moved focus into the carousel; leave it so only the pause holds rotation.
    fireEvent.blur(screen.getByRole('button', { name: 'Tự chuyển banner' }));
    act(() => vi.advanceTimersByTime(bannerInterval * 3));
    expect(activeSlide()).toHaveAccessibleName('2 / 3: Hạt & đậu');
  });

  it('lets people pick a slide and links to real catalog views', () => {
    renderApp(<BannerCarousel />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Banner 3: Thanh toán' }),
    );
    const slide = activeSlide();
    expect(slide).toHaveAccessibleName('3 / 3: Thanh toán');
    expect(
      within(slide!).getByRole('link', { name: /Mở giỏ hàng/ }),
    ).toHaveAttribute('href', '/cart');
    expect(screen.queryByText(/giảm|miễn phí/i)).not.toBeInTheDocument();
  });
});

describe('Collections', () => {
  it('resolves category tiles to live ids and falls back to the catalog', () => {
    const { unmount } = renderApp(
      <Collections
        categories={[{ id: 7, name: 'Rau củ', slug: 'rau-cu' } as never]}
      />,
    );
    expect(screen.getByRole('link', { name: /Rau củ/ })).toHaveAttribute(
      'href',
      '/products?categoryId=7',
    );
    expect(screen.getByRole('link', { name: /Ngũ cốc/ })).toHaveAttribute(
      'href',
      '/products',
    );
    expect(screen.getByRole('link', { name: /Ít đường/ })).toHaveAttribute(
      'href',
      '/products?label=LOW_SUGAR',
    );
    unmount();
  });
});
