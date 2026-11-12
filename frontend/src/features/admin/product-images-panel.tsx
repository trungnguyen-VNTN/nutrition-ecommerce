import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ImageSquare,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Note } from '@/components/ui/note';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state';
import { apiErrorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import {
  acceptedImageTypes,
  checkImageFile,
  deleteImage,
  imageErrorMessage,
  listImages,
  maxImages,
  moved,
  reorderImages,
  uploadImage,
} from './product-images';

// Admin photo manager for one product: upload (JPEG/PNG/WebP, 2 MB, max 5), reorder with
// buttons (no drag needed, keyboard friendly) and delete with confirmation.
export function ProductImagesPanel({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  const inputId = useId();
  const hintId = useId();
  const cache = useQueryClient();
  const key = ['admin-product-images', productId];
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const images = useQuery({
    queryKey: key,
    queryFn: () => listImages(productId),
    retry: false,
  });
  const refresh = async () => {
    await cache.invalidateQueries({ queryKey: key });
    await cache.invalidateQueries({ queryKey: ['products'] });
    await cache.invalidateQueries({ queryKey: ['product'] });
  };
  const done = (message: string) => async () => {
    setError(null);
    setStatus(message);
    await refresh();
  };
  const failed = (cause: unknown) => {
    setStatus(null);
    setError(imageErrorMessage(cause));
  };
  const upload = useMutation({
    mutationFn: (file: File) => uploadImage(productId, file),
    onSuccess: done('Đã tải ảnh lên.'),
    onError: failed,
  });
  const remove = useMutation({
    mutationFn: (imageId: number) => deleteImage(productId, imageId),
    onSuccess: done('Đã xóa ảnh.'),
    onError: failed,
  });
  const reorder = useMutation({
    mutationFn: (ids: number[]) => reorderImages(productId, ids),
    onSuccess: done('Đã đổi thứ tự ảnh.'),
    onError: failed,
  });
  const busy = upload.isPending || remove.isPending || reorder.isPending;
  const list = images.data ?? [];
  const full = list.length >= maxImages;
  const ids = list.map((image) => image.id);

  return (
    <Card as="section" className="space-y-4" aria-labelledby={`${inputId}-h`}>
      <div className="space-y-1">
        <h4 id={`${inputId}-h`} className="text-lg font-bold">
          Ảnh sản phẩm
        </h4>
        <p id={hintId} className="text-sm text-ink-muted">
          JPEG, PNG hoặc WebP, tối đa 2 MB mỗi ảnh, tối đa {maxImages} ảnh. Ảnh
          đầu tiên là ảnh đại diện.
        </p>
      </div>

      {error && (
        <Note tone="error" role="alert">
          {error}
        </Note>
      )}
      {status && !error && (
        <Note tone="success" role="status">
          {status}
        </Note>
      )}

      {images.isPending ? (
        <Skeleton className="h-28 rounded-card" />
      ) : images.isError ? (
        <ErrorState
          description={apiErrorMessage(images.error)}
          error={images.error}
          onRetry={() => void images.refetch()}
        />
      ) : list.length === 0 ? (
        <p className="flex items-center gap-2 rounded-card bg-sunken p-4 text-sm text-ink-muted">
          <ImageSquare aria-hidden="true" className="size-5 shrink-0" />
          Chưa có ảnh. Khách sẽ thấy hình minh họa cho tới khi có ảnh thật.
        </p>
      ) : (
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((image, index) => (
            <li
              key={image.id}
              className="space-y-2 rounded-card border border-line bg-surface p-2"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-control bg-sunken">
                <img
                  src={image.url}
                  alt={`Ảnh ${index + 1} của ${productName}`}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-pill bg-ink px-2 py-0.5 text-xs font-semibold text-cream">
                    Ảnh đại diện
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="px-3"
                  disabled={busy || index === 0}
                  aria-label={`Đưa ảnh ${index + 1} lên trước`}
                  onClick={() => reorder.mutate(moved(ids, index, -1))}
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  className="px-3"
                  disabled={busy || index === list.length - 1}
                  aria-label={`Đưa ảnh ${index + 1} ra sau`}
                  onClick={() => reorder.mutate(moved(ids, index, 1))}
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="ml-auto text-danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(`Xóa ảnh ${index + 1} của sản phẩm này?`)
                    )
                      remove.mutate(image.id);
                  }}
                >
                  <Trash aria-hidden="true" className="size-4" />
                  Xóa
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div>
        <label
          htmlFor={inputId}
          className={cn(
            'control-transition inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-control border border-ink bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-sunken focus-within:ring-2 focus-within:ring-ink',
            (busy || full || images.isPending) &&
              'cursor-not-allowed opacity-50 hover:bg-surface',
          )}
        >
          <UploadSimple aria-hidden="true" className="size-4" />
          {upload.isPending
            ? 'Đang tải ảnh…'
            : full
              ? `Đã đủ ${maxImages} ảnh`
              : 'Tải ảnh lên'}
          <input
            id={inputId}
            type="file"
            accept={acceptedImageTypes.join(',')}
            aria-describedby={hintId}
            disabled={busy || full || images.isPending}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              const problem = checkImageFile(file);
              if (problem) {
                setStatus(null);
                setError(problem);
                return;
              }
              upload.mutate(file);
            }}
          />
        </label>
      </div>
    </Card>
  );
}
