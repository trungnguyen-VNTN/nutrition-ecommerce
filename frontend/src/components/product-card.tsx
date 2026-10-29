import { Link } from 'react-router-dom';
import { messages } from '@/app/messages.vi';
import type { Product } from '@/lib/api/catalog.types';
import { formatMoney } from '@/lib/format';
import { DataStatusBadge } from './data-status-badge';

export function ProductCard({
  product,
  index,
}: {
  product: Product;
  index: number;
}) {
  const tone = ['green', 'grain', 'warm'][index % 3];
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-neutral-200 bg-neutral-50 shadow-sm">
      <div className="product-art" data-tone={tone}>
        <svg
          viewBox="0 0 120 140"
          role="img"
          aria-label={messages.illustration(product.name)}
        >
          <path
            d="M28 12h64l6 116H22Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M28 24h64M25 112h70"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="60" cy="68" r="26" fill="currentColor" opacity="0.1" />
          <path
            d="M60 88V52m0 12c-15 0-18-12-18-12 14 0 18 12 18 12Zm0 12c15 0 18-12 18-12-14 0-18 12-18 12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="pb-3 text-xs">{messages.sampleImage}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-xs text-neutral-700">
          {product.stock > 0 ? messages.inStock : messages.outOfStock}
        </p>
        <h2 className="text-lg font-semibold">
          <Link
            className="flex min-h-touch items-center text-neutral-900 hover:text-primary-700"
            to={`/products/${product.id}`}
          >
            <span className="line-clamp-2">{product.name}</span>
          </Link>
        </h2>
        <p className="text-xl font-semibold tabular-nums text-primary-700">
          {formatMoney(product.price, product.currency)}
        </p>
        <div className="mt-auto grid gap-2 border-t border-neutral-200 pt-3">
          <div className="flex min-h-8 items-center">
            {product.nutrition_complete ? (
              <span className="text-xs text-neutral-700">
                {messages.nutritionVerified}
              </span>
            ) : (
              <DataStatusBadge kind="nutrition" />
            )}
          </div>
          <div className="flex min-h-8 items-center">
            {product.allergens_verified ? (
              <span className="text-xs text-neutral-700">
                <span aria-hidden="true">✓ </span>
                {messages.allergensVerified}
              </span>
            ) : (
              <DataStatusBadge kind="allergens" />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
