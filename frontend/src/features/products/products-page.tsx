import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProductFiltersForm } from './product-filters';
import {
  filtersSchema,
  productQuery,
  type ProductFilters,
} from './api/filters';
import { messages } from '@/app/messages.vi';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/api/client';
import { useProducts } from './hooks/use-products';

function ProductList({
  filters,
  onPage,
}: {
  filters: ProductFilters;
  onPage: (page: number) => void;
}) {
  const query = useProducts(filters);
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
      <nav
        aria-label={messages.pagination}
        className="mt-6 flex flex-wrap items-center gap-4"
      >
        <Button
          variant="secondary"
          disabled={filters.page === 0}
          onClick={() => onPage(filters.page - 1)}
        >
          {messages.previous}
        </Button>
        <span className="text-sm">
          {messages.pageNumber(
            filters.page + 1,
            Math.ceil(query.data.total / query.data.size),
          )}
        </span>
        <Button
          variant="secondary"
          disabled={(filters.page + 1) * query.data.size >= query.data.total}
          onClick={() => onPage(filters.page + 1)}
        >
          {messages.next}
        </Button>
      </nav>
    </>
  );
}

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const parsed = filtersSchema.safeParse(Object.fromEntries(params));
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
      <ProductFiltersForm
        filters={parsed.success ? parsed.data : null}
        onClear={() => setParams({})}
        onApply={(values) => {
          const next = new URLSearchParams();
          for (const [key, value] of Object.entries(values))
            if (String(value).trim() !== '') next.set(key, String(value));
          next.set('page', '0');
          setParams(next);
        }}
      />
      <p className="rounded-control bg-primary-50 p-4 text-sm text-primary-700">
        {messages.sampleNotice}
      </p>
      {parsed.success ? (
        <ProductList
          filters={parsed.data}
          onPage={(page) => setParams(productQuery({ ...parsed.data, page }))}
        />
      ) : (
        <p role="alert" className="text-danger">
          {messages.invalidFilters}
        </p>
      )}
    </div>
  );
}
