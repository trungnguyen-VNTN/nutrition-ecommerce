import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle } from '@phosphor-icons/react';
import { messages } from '@/app/messages.vi';
import type { Product } from '@/lib/api/catalog.types';
import { formatMoney } from '@/lib/format';
import { DataStatusBadge } from './data-status-badge';
import { ProductArt } from './product-art';

export function ProductCard({
  product,
  index,
}: {
  product: Product;
  index: number;
}) {
  return (
    <article className="product-card overflow-hidden rounded-card border border-neutral-200 shadow-sm">
      <ProductArt name={product.name} index={index} />
      <div className="product-card-body flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
        <p
          className={`stock-label text-xs ${product.stock > 0 ? 'text-success' : 'text-danger'}`}
        >
          {product.stock > 0 ? messages.inStock : messages.outOfStock}
        </p>
        <h2 className="text-base font-semibold sm:text-lg">
          <Link
            className="flex min-h-touch items-center justify-between gap-2 text-neutral-900 hover:text-primary-700"
            to={`/products/${product.id}`}
          >
            <span className="line-clamp-2">{product.name}</span>
            <ArrowUpRight className="icon text-primary-700" />
          </Link>
        </h2>
        <p className="text-lg font-semibold tabular-nums text-primary-700 sm:text-xl">
          {formatMoney(product.price, product.currency)}
        </p>
        <div className="mt-auto grid gap-2 border-t border-neutral-200 pt-3">
          {product.nutrition_complete && product.nutrition && (
            <div className="nutrition-preview">
              <span>{product.nutrition.calories} kcal</span>
              <span>{product.nutrition.protein_g}g protein</span>
              <p className="w-full">
                {messages.serving(product.serving_size!, product.serving_unit!)}
              </p>
            </div>
          )}
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
              <span className="inline-flex items-center gap-1 text-xs text-neutral-700">
                <CheckCircle className="icon text-success" />
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
