import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, X } from '@phosphor-icons/react';
import { useSearchParams } from 'react-router-dom';
import { DietLabelTags } from '@/components/diet-label-tags';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { macroDot } from '@/components/ui/macro';
import { Note } from '@/components/ui/note';
import { Skeleton } from '@/components/ui/skeleton';
import { getProducts } from '@/features/products/api/products';
import { apiErrorMessage } from '@/lib/api/client';
import { dietLabelNote } from '@/lib/diet-labels';
import { energySplit, formatAmount } from '@/lib/nutrition';
import {
  analyzeMeal,
  formatItems,
  maxGrams,
  maxItems,
  parseItems,
  type MealAnalysis,
  type MealItem,
} from './meal-api';

function useDebounced<T>(value: T, ms: number) {
  const [current, setCurrent] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setCurrent(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return current;
}

const rows: [keyof MealAnalysis['total'], string, string][] = [
  ['calories', 'Năng lượng', 'kcal'],
  ['protein_g', 'Protein', 'g'],
  ['carbs_g', 'Carbohydrate', 'g'],
  ['fat_g', 'Chất béo', 'g'],
  ['sugar_g', 'Đường', 'g'],
  ['fiber_g', 'Chất xơ', 'g'],
  ['sodium_mg', 'Natri', 'mg'],
];
const macroNames = {
  protein: 'Protein',
  carb: 'Carbohydrate',
  fat: 'Chất béo',
};

// Meal nutrition calculator (D26): every number comes from the API, which reads the database.
export function MealPage() {
  const [params, setParams] = useSearchParams();
  const items = parseItems(params.get('items'));
  const [names, setNames] = useState<Record<number, string>>({});
  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim(), 300);
  const key = useDebounced(formatItems(items), 400);

  const results = useQuery({
    queryKey: ['meal-search', search],
    queryFn: ({ signal }) => getProducts({ page: 0, q: search }, signal),
    enabled: search.length > 0,
    retry: false,
  });
  const analysis = useQuery({
    queryKey: ['meal-analysis', key],
    queryFn: ({ signal }) => analyzeMeal(parseItems(key), signal),
    enabled: key !== '',
    placeholderData: keepPreviousData,
    retry: false,
  });

  const save = (next: MealItem[]) => {
    const copy = new URLSearchParams(params);
    if (next.length) copy.set('items', formatItems(next));
    else copy.delete('items');
    setParams(copy, { replace: true });
  };
  const nameOf = (id: number) =>
    names[id] ??
    analysis.data?.items.find((line) => line.product_id === id)?.name ??
    `Sản phẩm #${id}`;

  return (
    <section className="space-y-6 md:space-y-8">
      <header className="max-w-copy space-y-3">
        <p className="eyebrow">Công cụ dinh dưỡng</p>
        <h1 className="text-3xl font-extrabold md:text-4xl">
          Phân tích bữa ăn
        </h1>
        <p className="text-ink-muted">
          Chọn sản phẩm và khối lượng để xem tổng năng lượng, chất dinh dưỡng và
          nhãn của cả bữa. Số liệu lấy từ cơ sở dữ liệu sản phẩm.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="space-y-5">
          <h2 className="text-xl font-bold">Thực phẩm trong bữa</h2>
          <Field
            label="Tìm sản phẩm để thêm"
            hint={`Tối đa ${maxItems} sản phẩm.`}
          >
            {(control) => (
              <Input
                {...control}
                type="search"
                maxLength={100}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            )}
          </Field>
          {search && (
            <div aria-live="polite">
              {results.isFetching ? (
                <p className="text-sm text-ink-muted">Đang tìm…</p>
              ) : results.isError ? (
                <Note tone="error">{apiErrorMessage(results.error)}</Note>
              ) : results.data?.items.length ? (
                <ul
                  aria-label="Kết quả tìm kiếm"
                  className="divide-y divide-line"
                >
                  {results.data.items.map((product) => {
                    const id = Number(product.id);
                    const added = items.some((item) => item.productId === id);
                    return (
                      <li
                        key={product.id}
                        className="flex min-h-touch items-center justify-between gap-3 py-1"
                      >
                        <span>
                          {product.name}
                          {product.nutrition && (
                            <span className="ml-2 text-xs text-ink-muted tabular-nums">
                              {formatAmount(product.nutrition.calories)} kcal /{' '}
                              {product.serving_size}
                              {product.serving_unit}
                            </span>
                          )}
                        </span>
                        <Button
                          variant="outline"
                          disabled={added || items.length >= maxItems}
                          aria-label={`Thêm ${product.name}`}
                          onClick={() => {
                            setNames((all) => ({ ...all, [id]: product.name }));
                            save([...items, { productId: id, grams: 100 }]);
                          }}
                        >
                          <Plus aria-hidden="true" />
                          {added ? 'Đã thêm' : 'Thêm'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">
                  Không tìm thấy sản phẩm.
                </p>
              )}
            </div>
          )}
          {items.length === 0 ? (
            <p className="rounded-control border border-dashed border-line-strong p-4 text-sm text-ink-muted">
              Chưa có thực phẩm nào. Tìm và thêm sản phẩm ở trên.
            </p>
          ) : (
            <ul aria-label="Thực phẩm đã chọn" className="space-y-2">
              {items.map((item, index) => (
                <li
                  key={item.productId}
                  className="flex items-end gap-3 rounded-control border border-line p-3"
                >
                  <Field
                    label={`${nameOf(item.productId)} (gram)`}
                    className="flex-1"
                  >
                    {(control) => (
                      <Input
                        {...control}
                        type="number"
                        inputMode="decimal"
                        min={1}
                        max={maxGrams}
                        step="any"
                        defaultValue={item.grams}
                        onChange={(event) => {
                          const grams = Number(event.target.value);
                          if (grams >= 1 && grams <= maxGrams)
                            save(
                              items.map((other, i) =>
                                i === index ? { ...other, grams } : other,
                              ),
                            );
                        }}
                      />
                    )}
                  </Field>
                  <Button
                    variant="ghost"
                    aria-label={`Bỏ ${nameOf(item.productId)}`}
                    onClick={() => save(items.filter((_, i) => i !== index))}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="space-y-5" aria-live="polite">
          <h2 className="text-xl font-bold">Kết quả</h2>
          {items.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Kết quả hiện ở đây khi bữa ăn có ít nhất một thực phẩm.
            </p>
          ) : analysis.isError ? (
            <ErrorState
              description={apiErrorMessage(analysis.error)}
              error={analysis.error}
              onRetry={() => void analysis.refetch()}
            />
          ) : !analysis.data ? (
            <div aria-busy="true" className="space-y-3">
              <Skeleton className="h-12 w-1/2" />
              <Skeleton className="h-40" />
            </div>
          ) : (
            <Result analysis={analysis.data} />
          )}
        </Card>
      </div>
    </section>
  );
}

function Result({ analysis }: { analysis: MealAnalysis }) {
  const split = energySplit({
    ...analysis.total,
    source: 'meal',
  });
  return (
    <div className="space-y-5">
      {!analysis.complete && (
        <Note tone="missing" role="status">
          Tổng chưa đầy đủ: {analysis.incomplete_products.join(', ')} chưa có đủ
          dữ liệu dinh dưỡng nên không được cộng vào và bữa ăn không được gắn
          nhãn.
        </Note>
      )}
      <p>
        <span className="font-display text-4xl font-extrabold tabular-nums">
          {formatAmount(analysis.total.calories)}
        </span>{' '}
        kcal cho {formatAmount(analysis.total_grams)} g
        {!analysis.complete && ' (chưa đầy đủ)'}
      </p>
      <table className="w-full text-sm">
        <caption className="sr-only">Tổng chất dinh dưỡng của bữa ăn</caption>
        <thead>
          <tr className="border-b border-line text-left text-ink-muted">
            <th scope="col" className="py-2 font-semibold">
              Chất dinh dưỡng
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Tổng
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([field, label, unit]) => {
            const value = analysis.total[field];
            return (
              <tr key={field} className="border-b border-line">
                <th scope="row" className="py-2 text-left font-medium">
                  {label}
                </th>
                <td className="py-2 text-right tabular-nums">
                  {value === null ? (
                    <span className="text-warning">Chưa đủ dữ liệu</span>
                  ) : (
                    `${formatAmount(value)} ${unit}`
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {split && (
        <figure className="space-y-2">
          <figcaption className="text-sm font-semibold">
            Năng lượng từ chất đa lượng
          </figcaption>
          <div
            aria-hidden="true"
            className="flex h-3 gap-0.5 overflow-hidden rounded-pill bg-sunken"
          >
            {split
              .filter((part) => part.share > 0)
              .map((part) => (
                <span
                  key={part.macro}
                  className={macroDot[part.macro]}
                  style={{ width: `${part.share * 100}%` }}
                />
              ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {split.map((part) => (
              <li key={part.macro} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`size-2.5 rounded-pill ${macroDot[part.macro]}`}
                />
                {macroNames[part.macro]}{' '}
                <span className="tabular-nums">
                  {Math.round(part.share * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </figure>
      )}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Nhãn của cả bữa</h3>
        {analysis.diet_labels.length ? (
          <DietLabelTags labels={analysis.diet_labels} />
        ) : (
          <p className="text-sm text-ink-muted">
            Bữa ăn chưa đạt ngưỡng nhãn nào, hoặc chưa đủ dữ liệu.
          </p>
        )}
        <p className="text-xs text-ink-muted">{dietLabelNote}</p>
      </div>
    </div>
  );
}
