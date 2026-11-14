import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CaretUp, Funnel, X } from '@phosphor-icons/react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/field';
import { Note } from '@/components/ui/note';
import { getCategories } from './api/products';
import { FilterSheet } from './filter-sheet';
import { ProductFiltersForm } from './product-filters';
import {
  filtersSchema,
  productQuery,
  type ProductFilters,
  type ProductSort,
  allergenOptions,
  sortValues,
} from './api/filters';
import { messages } from '@/app/messages.vi';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/api/client';
import { useProducts } from './hooks/use-products';

const filterKeys = [
  'q',
  'categoryId',
  'maxCalories',
  'minProtein',
  'excludeAllergen',
];

const chipPrefix: Record<string, string> = {
  q: 'Tìm: ',
  categoryId: 'Danh mục: ',
  maxCalories: 'Calo ≤ ',
  minProtein: 'Protein ≥ ',
  excludeAllergen: 'Không chứa: ',
};
const grid = 'grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3';

function ProductList({
  filters,
  filtered,
  onClearFilters,
  onPage,
  onSort,
}: {
  filters: ProductFilters;
  filtered: boolean;
  onClearFilters: () => void;
  onPage: (page: number) => void;
  onSort: (sort: ProductSort) => void;
}) {
  const sortControl = (
    <Field
      label={messages.sortLabel}
      className="w-full sm:w-56"
      hint={
        filters.sort === 'protein_desc' || filters.sort === 'calories_asc'
          ? messages.sortNutritionNote
          : undefined
      }
    >
      {(control) => (
        <Select
          {...control}
          value={filters.sort}
          onChange={(event) => onSort(event.target.value as ProductSort)}
        >
          {sortValues.map((value) => (
            <option key={value} value={value}>
              {messages.sortOptions[value]}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
  const query = useProducts(filters);
  if (query.isFetching) {
    return (
      <section aria-busy="true" aria-label={messages.loading}>
        <p className="sr-only" role="status">
          {messages.loading}
        </p>
        <div className="mb-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Skeleton className="h-[var(--line-sm)] w-1/3 sm:w-1/6" />
          {sortControl}
        </div>
        <div className={grid}>
          {Array.from({ length: 8 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </section>
    );
  }
  if (query.isError)
    return (
      <ErrorState
        description={apiErrorMessage(query.error)}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data || query.data.items.length === 0)
    return filtered ? (
      <EmptyState
        description={messages.filteredEmpty}
        action={
          <Button variant="outline" onClick={onClearFilters}>
            {messages.clearAllFilters}
          </Button>
        }
      />
    ) : (
      <EmptyState onRefresh={() => void query.refetch()} />
    );
  return (
    <>
      <div className="mb-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-ink-muted" role="status">
          {messages.sampleCount(query.data.total)}
        </p>
        {sortControl}
      </div>
      <ul className={grid}>
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
          variant="outline"
          disabled={filters.page === 0}
          onClick={() => onPage(filters.page - 1)}
        >
          {messages.previous}
        </Button>
        <span className="text-sm tabular-nums">
          {messages.pageNumber(
            filters.page + 1,
            Math.ceil(query.data.total / query.data.size),
          )}
        </span>
        <Button
          variant="outline"
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => getCategories(signal),
    retry: false,
  });
  const active = Array.from(params.entries()).filter(
    ([key, value]) => filterKeys.includes(key) && value !== '',
  );
  const chipValue = (key: string, value: string) =>
    key === 'excludeAllergen'
      ? (allergenOptions.find((o) => o.code === value)?.label ?? value)
      : key === 'categoryId'
        ? (categories.data?.find((c) => String(c.id) === value)?.name ?? value)
        : value;
  return (
    <div className="space-y-6 md:space-y-8">
      <header className="max-w-copy space-y-3">
        <p className="eyebrow">{messages.eyebrow}</p>
        <h1 className="text-3xl font-extrabold md:text-4xl">
          {messages.products}
        </h1>
        <p className="text-ink-muted">{messages.productsDescription}</p>
      </header>
      <div className="grid items-start gap-6 md:grid-cols-[var(--filter-width)_minmax(0,1fr)] md:gap-8">
        <aside aria-label="Bộ lọc sản phẩm">
          <Button
            variant="outline"
            className="w-full justify-between md:hidden"
            aria-expanded={filtersOpen}
            aria-controls="product-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <span className="inline-flex items-center gap-2">
              <Funnel />
              {messages.filters}
              {active.length > 0 && (
                <span className="text-xs font-medium">
                  · {messages.activeFilters(active.length)}
                </span>
              )}
            </span>
            <CaretUp />
          </Button>
          <FilterSheet
            id="product-filters"
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
          >
            <ProductFiltersForm
              filters={parsed.success ? parsed.data : null}
              onClear={() => {
                setParams({});
                setFiltersOpen(false);
              }}
              onApply={(values) => {
                const next = new URLSearchParams(values);
                next.set('page', '0');
                // Applying filters keeps the chosen order.
                const sort = params.get('sort');
                if (sort) next.set('sort', sort);
                setParams(next);
                setFiltersOpen(false);
              }}
            />
          </FilterSheet>
        </aside>
        <div className="min-w-0">
          {parsed.success && active.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {active.map(([key, value]) => (
                <Button
                  key={`${key}-${value}`}
                  variant="secondary"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete(key, value);
                    next.set('page', '0');
                    setParams(next);
                  }}
                  aria-label={`Bỏ lọc ${chipValue(key, value)}`}
                >
                  <span className="text-xs">
                    {chipPrefix[key]}
                    {chipValue(key, value)}
                  </span>
                  <X />
                </Button>
              ))}
            </div>
          )}
          {import.meta.env.DEV && (
            <Note className="mb-6">{messages.sampleNotice}</Note>
          )}
          {parsed.success ? (
            <ProductList
              filters={parsed.data}
              filtered={active.length > 0}
              onClearFilters={() => setParams({})}
              onPage={(page) =>
                setParams(productQuery({ ...parsed.data, page }))
              }
              onSort={(sort) =>
                setParams(productQuery({ ...parsed.data, sort, page: 0 }))
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
