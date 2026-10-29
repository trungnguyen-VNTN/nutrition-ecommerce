import { messages } from '@/app/messages.vi';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/api/client';
import { useProducts } from './hooks/use-products';

function ProductList() {
  const query = useProducts();
  if (query.isFetching) {
    return (
      <section aria-busy="true" aria-label={messages.loading}>
        <p className="sr-only" role="status">
          {messages.loading}
        </p>
        <Skeleton className="mb-6 h-[var(--line-sm)] w-1/3 sm:w-1/6" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-card border border-neutral-200"
              data-testid="product-skeleton"
            >
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="flex flex-col gap-3 p-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-touch w-full" />
                <Skeleton className="h-[var(--line-xl)] w-1/2" />
                <div className="grid gap-2 border-t border-neutral-200 pt-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (query.isError)
    return (
      <ErrorState
        description={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data || query.data.items.length === 0)
    return <EmptyState onRefresh={() => void query.refetch()} />;
  return (
    <>
      <p className="mb-6 text-sm text-neutral-700" role="status">
        {messages.sampleCount(query.data.total)}
      </p>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {query.data.items.map((product, index) => (
          <li key={product.id}>
            <ProductCard product={product} index={index} />
          </li>
        ))}
      </ul>
    </>
  );
}

export function ProductsPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-copy space-y-3">
        <p className="text-xs font-semibold text-primary-700">
          {messages.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold md:text-4xl">
          {messages.products}
        </h1>
        <p className="text-neutral-700">{messages.productsDescription}</p>
      </header>
      {import.meta.env.DEV ? (
        <>
          <p className="rounded-control bg-primary-50 p-4 text-sm text-primary-700">
            {messages.sampleNotice}
          </p>
          <ProductList />
        </>
      ) : (
        <section className="rounded-card border border-neutral-200 p-8">
          <h2 className="text-xl font-semibold">{messages.productionTitle}</h2>
          <p className="mt-2 text-neutral-700">
            {messages.productionDescription}
          </p>
        </section>
      )}
    </div>
  );
}
