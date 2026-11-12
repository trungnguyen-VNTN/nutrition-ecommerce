import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { messages } from '@/app/messages.vi';
import { ProductGallery } from '@/features/products/product-gallery';
import { ProductArt } from '../product-art';

describe('ProductArt', () => {
  it('shows the real photo with alt text and lazy loading', () => {
    render(<ProductArt name="Yến mạch" imageUrl="/images/products/1/a.jpg" />);
    const photo = screen.getByRole('img', {
      name: messages.productPhoto('Yến mạch'),
    });
    expect(photo).toHaveAttribute('src', '/images/products/1/a.jpg');
    expect(photo).toHaveAttribute('loading', 'lazy');
    expect(screen.queryByText(messages.noPhoto, { exact: false })).toBeNull();
  });

  it('falls back to the drawing without a photo or when it fails to load', () => {
    const { rerender } = render(<ProductArt name="Yến mạch" />);
    expect(
      screen.getByRole('img', { name: messages.illustration('Yến mạch') }),
    ).toBeInTheDocument();
    rerender(<ProductArt name="Yến mạch" imageUrl="/images/broken.jpg" />);
    fireEvent.error(
      screen.getByRole('img', { name: messages.productPhoto('Yến mạch') }),
    );
    expect(
      screen.getByRole('img', { name: messages.illustration('Yến mạch') }),
    ).toBeInTheDocument();
  });
});

describe('ProductGallery', () => {
  const images = [
    { id: 1, url: '/images/products/1/a.jpg' },
    { id: 2, url: '/images/products/1/b.jpg' },
  ];

  it('loads the primary photo eagerly and switches with thumbnail buttons', async () => {
    render(<ProductGallery name="Yến mạch" images={images} />);
    const main = () =>
      screen.getByRole('img', { name: messages.productPhoto('Yến mạch') });
    expect(main()).toHaveAttribute('src', images[0]?.url);
    expect(main()).toHaveAttribute('loading', 'eager');
    const second = screen.getByRole('button', {
      name: messages.productPhotoNumber('Yến mạch', 2, 2),
    });
    expect(second).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(second);
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(main()).toHaveAttribute('src', images[1]?.url);
  });

  it('shows no thumbnails for a single photo or none', () => {
    render(<ProductGallery name="Yến mạch" images={images.slice(0, 1)} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
