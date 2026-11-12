import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/mocks/server';
import { ApiError } from '@/lib/api/client';
import { renderApp } from '@/test/render';
import {
  checkImageFile,
  imageErrorMessage,
  imageMessages,
  maxImageBytes,
  moved,
} from './product-images';
import { ProductImagesPanel } from './product-images-panel';

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({ sub: 'admin-test', admin: true }),
  accessToken: async () => null,
  signOut: vi.fn(),
}));

const png = (size = 64) =>
  new File([new Uint8Array(size)], 'a.png', { type: 'image/png' });

describe('image rules', () => {
  it('checks type and size before uploading', () => {
    expect(checkImageFile(png())).toBeNull();
    expect(
      checkImageFile(new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })),
    ).toBe(imageMessages.type);
    expect(checkImageFile(png(maxImageBytes + 1))).toBe(imageMessages.size);
  });

  it('maps server errors to specific messages', () => {
    expect(imageErrorMessage(new ApiError(400))).toBe(imageMessages.type);
    expect(imageErrorMessage(new ApiError(413))).toBe(imageMessages.size);
    expect(imageErrorMessage(new ApiError(409))).toBe(imageMessages.limit);
  });

  it('moves an image one step and ignores moves past the ends', () => {
    expect(moved([1, 2, 3], 1, -1)).toEqual([2, 1, 3]);
    expect(moved([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
    expect(moved([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moved([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });
});

describe('ProductImagesPanel', () => {
  let stored: { id: number; url: string; sort_order: number }[];
  // Content-Type of each upload (multipart parsing of jsdom bodies is unreliable in Node).
  const uploads: string[] = [];

  beforeEach(() => {
    uploads.length = 0;
    stored = [
      { id: 1, url: '/api/local-images/products/7/a.png', sort_order: 0 },
    ];
    server.use(
      http.get('*/api/admin/products/7/images', () =>
        HttpResponse.json(stored),
      ),
      http.post('*/api/admin/products/7/images', async ({ request }) => {
        uploads.push(request.headers.get('content-type') ?? '');
        const image = {
          id: 2,
          url: '/api/local-images/products/7/b.png',
          sort_order: 1,
        };
        stored = [...stored, image];
        return HttpResponse.json(image, { status: 201 });
      }),
      http.delete('*/api/admin/products/7/images/1', () => {
        stored = [];
        return new HttpResponse(null, { status: 204 });
      }),
    );
  });

  it('lists photos with the primary badge and uploads a valid file', async () => {
    renderApp(<ProductImagesPanel productId={7} productName="Yến mạch" />);
    expect(await screen.findByAltText('Ảnh 1 của Yến mạch')).toBeVisible();
    expect(screen.getByText('Ảnh đại diện')).toBeVisible();
    await userEvent.upload(screen.getByLabelText('Tải ảnh lên'), png());
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Đã tải ảnh lên.',
    );
    expect(uploads).toHaveLength(1);
    expect(uploads[0]).toMatch(/^multipart\/form-data; boundary=/);
    expect(await screen.findByAltText('Ảnh 2 của Yến mạch')).toBeVisible();
  });

  it('rejects an oversized file in the browser without calling the API', async () => {
    renderApp(<ProductImagesPanel productId={7} productName="Yến mạch" />);
    await screen.findByAltText('Ảnh 1 của Yến mạch');
    await userEvent.upload(
      screen.getByLabelText('Tải ảnh lên'),
      png(maxImageBytes + 1),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      imageMessages.size,
    );
    expect(uploads).toHaveLength(0);
  });

  it('deletes only after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderApp(<ProductImagesPanel productId={7} productName="Yến mạch" />);
    const remove = await screen.findByRole('button', { name: 'Xóa' });
    await userEvent.click(remove);
    expect(screen.getByAltText('Ảnh 1 của Yến mạch')).toBeVisible();
    confirm.mockReturnValueOnce(true);
    await userEvent.click(remove);
    await waitFor(() => expect(screen.getByText(/Chưa có ảnh/)).toBeVisible());
    confirm.mockRestore();
  });
});
