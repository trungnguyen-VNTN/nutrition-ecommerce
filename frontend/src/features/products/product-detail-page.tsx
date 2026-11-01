import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { messages } from '@/app/messages.vi';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state';
import { NutritionTable } from '@/components/nutrition-table';
import { AllergenBadge } from '@/components/allergen-badge';
import { apiErrorMessage } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { getProduct } from './api/products';

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['product', id],
    queryFn: ({ signal }) => getProduct(id, signal),
    retry: false,
  });
  const product = query.data;
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <Link to="/products">{messages.backProducts}</Link>
      </Button>
      {query.isPending ? (
        <section aria-label={messages.loading} aria-busy="true">
          <h1 className="text-3xl font-semibold">{messages.productDetail}</h1>
          <Skeleton className="mt-6 aspect-video w-full" />
        </section>
      ) : query.isError ? (
        <>
          <h1 className="text-3xl font-semibold">{messages.productDetail}</h1>
          <ErrorState
            description={apiErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        </>
      ) : (
        product && (
          <>
            <div className="grid items-start gap-8 md:grid-cols-2">
              <div className="product-art overflow-hidden rounded-card border border-neutral-200">
                <svg
                  role="img"
                  aria-label={messages.illustration(product.name)}
                  viewBox="0 0 120 140"
                >
                  <path
                    d="M28 12h64l6 116H22Z M28 24h64 M25 112h70 M60 88V52 M60 64c-15 0-18-12-18-12 14 0 18 12 18 12Z M60 76c15 0 18-12 18-12-14 0-18 12-18 12Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                <span className="pb-3 text-xs">{messages.sampleImage}</span>
              </div>
              <header className="space-y-4">
                {product.category && (
                  <p className="text-sm text-primary-700">
                    {product.category.name}
                  </p>
                )}
                <h1 className="text-3xl font-semibold md:text-4xl">
                  {product.name}
                </h1>
                <p className="text-2xl font-semibold tabular-nums text-primary-700">
                  {formatMoney(product.price, product.currency)}
                </p>
                <p className="text-sm">
                  {product.stock > 0 ? messages.inStock : messages.outOfStock}
                </p>
                <p className="text-neutral-700">
                  {product.description ?? messages.missingValue}
                </p>
              </header>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <section className="rounded-card border border-neutral-200 p-6">
                <h2 className="mb-4 text-xl font-semibold">
                  {messages.nutritionHeading}
                </h2>
                <NutritionTable product={product} />
              </section>
              <section className="space-y-4 rounded-card border border-neutral-200 p-6">
                <h2 className="text-xl font-semibold">
                  {messages.allergensHeading}
                </h2>
                <AllergenBadge product={product} />
                <p className="text-sm text-neutral-700">
                  {messages.medicalNote}
                </p>
              </section>
            </div>
          </>
        )
      )}
    </div>
  );
}
