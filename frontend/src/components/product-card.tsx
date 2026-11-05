import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle } from '@phosphor-icons/react';
import { messages } from '@/app/messages.vi';
import type { Product } from '@/lib/api/catalog.types';
import { formatMoney } from '@/lib/format';
import { formatAmount, readyNutrition } from '@/lib/nutrition';
import { Pill } from '@/components/ui/pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag } from '@/components/ui/tag';
import { DataStatusBadge } from './data-status-badge';
import { ProductArt } from './product-art';

// Row with thumbnail below 640px, stacked card above. Skeleton shares this frame (no layout jump).
const frame =
  'relative grid h-full grid-cols-[var(--product-thumb)_minmax(0,1fr)] overflow-hidden rounded-card border border-line bg-surface sm:flex sm:flex-col';
const art = 'min-h-[var(--product-thumb)] sm:aspect-[4/3] sm:min-h-0';
const body =
  'flex min-h-[var(--card-content-height-compact)] flex-1 flex-col gap-2 p-3 sm:min-h-[var(--card-content-height)] sm:gap-3 sm:p-4';

export function ProductCard({
  product,
  index,
}: {
  product: Product;
  index: number;
}) {
  const ready = readyNutrition(product);
  return (
    <article className={`${frame} control-transition group hover:border-ink`}>
      <ProductArt
        name={product.name}
        index={index}
        caption={false}
        className={art}
      />
      <div className={body}>
        <p className="text-xs text-ink-muted">
          {[
            product.category?.name,
            ready && messages.serving(ready.servingSize, ready.servingUnit),
          ]
            .filter(Boolean)
            .join(' · ') || messages.sampleImage}
        </p>
        <h2 className="text-base font-bold sm:text-lg">
          <Link
            className="flex min-h-touch items-start justify-between gap-2 text-ink after:absolute after:inset-0 group-hover:underline"
            to={`/products/${product.id}`}
          >
            <span className="line-clamp-2">{product.name}</span>
            <ArrowUpRight className="icon mt-1 text-brand" />
          </Link>
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {ready ? (
            <>
              <Pill macro="energy">
                {formatAmount(ready.nutrition.calories)} kcal
              </Pill>
              <Pill macro="protein">
                {formatAmount(ready.nutrition.protein_g)}g protein
              </Pill>
            </>
          ) : (
            <DataStatusBadge kind="nutrition" />
          )}
        </div>
        <div>
          {product.allergens_verified ? (
            <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
              <CheckCircle className="icon text-success" />
              {messages.allergensVerified}
            </span>
          ) : (
            <DataStatusBadge kind="allergens" />
          )}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-line pt-3">
          <p className="font-display text-lg font-extrabold tabular-nums sm:text-xl">
            {formatMoney(product.price, product.currency)}
          </p>
          {product.stock > 0 ? (
            <Tag tone="success">{messages.inStock}</Tag>
          ) : (
            <Tag tone="danger">{messages.outOfStock}</Tag>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className={frame} data-testid="product-skeleton">
      <Skeleton className={`${art} rounded-none`} />
      <div className={body}>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-touch w-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
        <div className="mt-auto border-t border-line pt-3">
          <Skeleton className="h-7 w-1/2" />
        </div>
      </div>
    </div>
  );
}
