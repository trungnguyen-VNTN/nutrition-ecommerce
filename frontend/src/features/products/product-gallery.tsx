import { useState } from 'react';
import { messages } from '@/app/messages.vi';
import { ProductArt } from '@/components/product-art';
import type { ProductImage } from '@/lib/api/catalog.types';
import { cn } from '@/lib/utils';

// Detail page photo: the primary image, plus thumbnails when there is more than one.
// Thumbnails are real buttons (keyboard and screen reader friendly, 44px targets).
export function ProductGallery({
  name,
  images = [],
}: {
  name: string;
  images?: ProductImage[];
}) {
  const [selected, setSelected] = useState(0);
  const current = images[Math.min(selected, images.length - 1)];
  return (
    <div className="space-y-3">
      <ProductArt
        name={name}
        imageUrl={current?.url}
        priority
        className="aspect-[4/3] rounded-sheet md:aspect-square"
      />
      {images.length > 1 && (
        <ul className="flex flex-wrap gap-2" aria-label="Ảnh sản phẩm">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                aria-pressed={index === selected}
                aria-label={messages.productPhotoNumber(
                  name,
                  index + 1,
                  images.length,
                )}
                onClick={() => setSelected(index)}
                className={cn(
                  'control-transition block size-16 overflow-hidden rounded-control border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
                  index === selected
                    ? 'border-ink'
                    : 'border-transparent opacity-80 hover:opacity-100',
                )}
              >
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
