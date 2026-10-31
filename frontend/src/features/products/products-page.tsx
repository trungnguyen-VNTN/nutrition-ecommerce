import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProductFiltersForm } from './product-filters';
import {
  filtersSchema,
  productQuery,
  type ProductFilters,
  allergenOptions,
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
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-card border border-neutral-200"
              data-testid="product-skeleton"
            >
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="product-card-body flex flex-col gap-3 p-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-touch w-full" />
                <Skeleton className="h-[var(--line-xl)] w-1/2" />
                <div className="mt-auto grid gap-2 border-t border-neutral-200 pt-3">
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
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
  const parsed = filtersSchema.safeParse({
    ...Object.fromEntries(params),
    excludeAllergen: params.getAll('excludeAllergen'),
  });
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
      <div className="catalog-layout">
        <aside
          className="filter-panel rounded-card"
          aria-label="Bộ lọc sản phẩm"
        >
          <ProductFiltersForm
            filters={parsed.success ? parsed.data : null}
            onClear={() => setParams({})}
            onApply={(values) => {
              const next = new URLSearchParams(values);
              next.set('page', '0');
              setParams(next);
            }}
          />
        </aside>
        <div className="min-w-0">
          {parsed.success && (
            <div className="mb-4 flex flex-wrap gap-2">
              {Array.from(params.entries())
                .filter(
                  ([key, value]) =>
                    [
                      'q',
                      'categoryId',
                      'maxCalories',
                      'minProtein',
                      'excludeAllergen',
                    ].includes(key) && value !== '',
                )
                .map(([key, value]) => (
                  <Button
                    key={`${key}-${value}`}
                    variant="secondary"
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.delete(key, value);
                      next.set('page', '0');
                      setParams(next);
                    }}
                    aria-label={`Bỏ lọc ${key === 'excludeAllergen' ? (allergenOptions.find((o) => o.code === value)?.label ?? value) : value}`}
                  >
                    <span className="text-xs">
                      {key === 'q'
                        ? 'Tìm: '
                        : key === 'categoryId'
                          ? 'Danh mục: '
                          : key === 'maxCalories'
                            ? 'Calo ≤ '
                            : key === 'minProtein'
                              ? 'Protein ≥ '
                              : 'Không chứa: '}
                      {key === 'excludeAllergen'
                        ? (allergenOptions.find((o) => o.code === value)
                            ?.label ?? value)
                        : value}
                    </span>
                    <span aria-hidden="true">×</span>
                  </Button>
                ))}
            </div>
          )}
          {import.meta.env.DEV && (
            <p className="mb-6 rounded-control bg-primary-50 p-4 text-sm text-primary-700">
              {messages.sampleNotice}
            </p>
          )}
          {parsed.success ? (
            <ProductList
              filters={parsed.data}
              onPage={(page) =>
                setParams(productQuery({ ...parsed.data, page }))
              }
            />
          ) : (
            <p role="alert" className="text-danger">
              {messages.invalidFilters}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
