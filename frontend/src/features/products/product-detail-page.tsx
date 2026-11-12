import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CaretDown, CaretRight } from '@phosphor-icons/react';
import { Link, useParams } from 'react-router-dom';
import { messages } from '@/app/messages.vi';
import { AllergenBadge } from '@/components/allergen-badge';
import { DataStatusBadge } from '@/components/data-status-badge';
import { Donut } from '@/components/donut';
import { ErrorState } from '@/components/error-state';
import { MacroBar } from '@/components/macro-bar';
import { NutritionLabel } from '@/components/nutrition-label';
import { ProductGallery } from './product-gallery';
import { ProductCard } from '@/components/product-card';
import { Note } from '@/components/ui/note';
import { Pill } from '@/components/ui/pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag } from '@/components/ui/tag';
import { AddToCart } from '@/features/commerce/cart-page';
import type { Product } from '@/lib/api/catalog.types';
import { apiErrorMessage } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { formatAmount, readyNutrition } from '@/lib/nutrition';
import { getProduct, getProducts } from './api/products';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-t-2 border-ink">
      <summary className="flex min-h-touch list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
        <h2 className="text-2xl font-bold">{title}</h2>
        <CaretDown className="icon control-transition text-xl group-open:rotate-180" />
      </summary>
      <div className="pb-8">{children}</div>
    </details>
  );
}

function Breadcrumb({ name }: { name?: string }) {
  return (
    <nav aria-label={messages.breadcrumb}>
      <ol className="flex flex-wrap items-center gap-x-1 text-sm text-ink-muted">
        <li>
          <Link
            className="inline-flex min-h-touch items-center underline underline-offset-4"
            to="/"
          >
            {messages.home}
          </Link>
        </li>
        <li className="flex items-center gap-x-1">
          <CaretRight className="icon" />
          <Link
            className="inline-flex min-h-touch items-center underline underline-offset-4"
            to="/products"
          >
            {messages.products}
          </Link>
        </li>
        {name && (
          <li className="flex items-center gap-x-1">
            <CaretRight className="icon" />
            <span aria-current="page" className="font-semibold text-ink">
              {name}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

// Secondary content: a failure here must not disturb the product itself, so it just hides.
function RelatedProducts({ product }: { product: Product }) {
  const categoryId = product.category?.id;
  const related = useQuery({
    queryKey: ['products', { page: 0, categoryId }],
    queryFn: ({ signal }) => getProducts({ page: 0, categoryId }, signal),
    enabled: categoryId !== undefined,
    retry: false,
  });
  const items =
    related.data?.items.filter((item) => item.id !== product.id).slice(0, 4) ??
    [];
  if (items.length === 0) return null;
  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold">{messages.related}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
        {items.map((item, index) => (
          <li key={item.id}>
            <ProductCard product={item} index={index + 1} headingLevel={3} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductDetail({ product }: { product: Product }) {
  const ready = readyNutrition(product);
  return (
    <>
      <div className="grid items-start gap-6 md:grid-cols-2 md:gap-12">
        <ProductGallery name={product.name} images={product.images} />
        <header className="space-y-5">
          {product.category && (
            <p className="eyebrow">{product.category.name}</p>
          )}
          <h1 className="text-4xl font-extrabold">{product.name}</h1>
          <div className="flex flex-wrap gap-2">
            {ready ? (
              <>
                <Pill macro="energy">
                  {formatAmount(ready.nutrition.calories)} kcal
                </Pill>
                <Pill macro="protein">
                  {formatAmount(ready.nutrition.protein_g)}g protein
                </Pill>
                <Pill macro="carb">
                  {formatAmount(ready.nutrition.carbs_g)}g carb
                </Pill>
                <Pill macro="fat">
                  {formatAmount(ready.nutrition.fat_g)}g béo
                </Pill>
              </>
            ) : (
              <DataStatusBadge kind="nutrition" />
            )}
          </div>
          {ready && (
            <p className="text-xs text-ink-muted">
              {messages.serving(ready.servingSize, ready.servingUnit)}
            </p>
          )}
          <p className="max-w-copy text-ink-muted">
            {product.description ?? messages.missingValue}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-3xl font-extrabold tabular-nums">
              {formatMoney(product.price, product.currency)}
            </p>
            {product.stock > 0 ? (
              <Tag tone="success">{messages.inStock}</Tag>
            ) : (
              <Tag tone="danger">{messages.outOfStock}</Tag>
            )}
          </div>
          <AddToCart id={product.id} stock={product.stock} />
        </header>
      </div>
      <div>
        <Section title={messages.nutritionHeading}>
          <div className="grid items-start gap-8 md:grid-cols-2">
            <NutritionLabel product={product} />
            {ready && (
              <div className="space-y-8">
                <Donut product={product} />
                <MacroBar product={product} />
              </div>
            )}
          </div>
        </Section>
        <Section title={messages.allergensHeading}>
          <div className="space-y-4">
            <AllergenBadge product={product} />
            {!product.allergens_verified && (
              <p className="max-w-copy text-sm text-ink-muted">
                {messages.missingNotNone}
              </p>
            )}
            <Note tone="medical">{messages.medicalNote}</Note>
          </div>
        </Section>
      </div>
      <RelatedProducts product={product} />
    </>
  );
}

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['product', id],
    queryFn: ({ signal }) => getProduct(id, signal),
    retry: false,
  });
  return (
    <div className="space-y-8">
      <Breadcrumb name={query.data?.name} />
      {query.isPending ? (
        <section aria-label={messages.loading} aria-busy="true">
          <h1 className="text-3xl font-bold">{messages.productDetail}</h1>
          <div className="mt-6 grid gap-6 md:grid-cols-2 md:gap-12">
            <Skeleton className="aspect-[4/3] rounded-sheet md:aspect-square" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-24" />
              <Skeleton className="h-12 w-1/2" />
            </div>
          </div>
        </section>
      ) : query.isError ? (
        <>
          <h1 className="text-3xl font-bold">{messages.productDetail}</h1>
          <ErrorState
            description={apiErrorMessage(query.error)}
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        </>
      ) : (
        <ProductDetail product={query.data} />
      )}
    </div>
  );
}
