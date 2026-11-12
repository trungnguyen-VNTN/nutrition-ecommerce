import { z } from 'zod';
import { ApiError, apiErrorMessage, requestJson } from '@/lib/api/client';

// Mirrors the backend limits (ProductImageService); the server re-checks everything.
export const maxImages = 5;
export const maxImageBytes = 2 * 1024 * 1024;
export const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

export const productImageSchema = z.object({
  id: z.number(),
  url: z.string(),
  sort_order: z.number(),
});
export type AdminProductImage = z.infer<typeof productImageSchema>;
const listSchema = z.array(productImageSchema);

const base = (productId: number) => `admin/products/${productId}/images`;

export const imageMessages = {
  type: 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.',
  size: 'Ảnh tối đa 2 MB. Hãy nén hoặc thu nhỏ ảnh rồi thử lại.',
  limit: `Mỗi sản phẩm có tối đa ${maxImages} ảnh. Xóa bớt ảnh trước khi tải thêm.`,
};

/** Checks a file in the browser before uploading; null means it may be sent. */
export function checkImageFile(file: File): string | null {
  if (!acceptedImageTypes.includes(file.type)) return imageMessages.type;
  if (file.size > maxImageBytes) return imageMessages.size;
  return null;
}

/** Specific messages for upload errors, falling back to the generic ones. */
export function imageErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return imageMessages.type;
    if (error.status === 413) return imageMessages.size;
    if (error.status === 409) return imageMessages.limit;
  }
  return apiErrorMessage(error);
}

export async function listImages(productId: number) {
  return listSchema.parse(await requestJson(base(productId)));
}

export async function uploadImage(productId: number, file: File) {
  const body = new FormData();
  body.append('file', file);
  return productImageSchema.parse(
    await requestJson(base(productId), { method: 'POST', body }),
  );
}

export async function deleteImage(productId: number, imageId: number) {
  await requestJson(`${base(productId)}/${imageId}`, { method: 'DELETE' });
}

export async function reorderImages(productId: number, imageIds: number[]) {
  return listSchema.parse(
    await requestJson(`${base(productId)}/order`, {
      method: 'PUT',
      body: JSON.stringify({ image_ids: imageIds }),
    }),
  );
}

/** Moves one image up (-1) or down (+1) and returns the new id order. */
export function moved(ids: number[], index: number, step: -1 | 1): number[] {
  const target = index + step;
  if (target < 0 || target >= ids.length) return ids;
  return ids.map((id, position) =>
    position === index
      ? (ids[target] ?? id)
      : position === target
        ? (ids[index] ?? id)
        : id,
  );
}
