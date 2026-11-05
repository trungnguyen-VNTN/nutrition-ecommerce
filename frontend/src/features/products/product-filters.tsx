import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CaretDown } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { controlClass } from '@/components/ui/field';
import { messages } from '@/app/messages.vi';
import { getCategories } from './api/products';
import { allergenOptions, type ProductFilters } from './api/filters';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-t border-line">
      <summary className="flex min-h-touch list-none items-center justify-between gap-2 font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <CaretDown className="icon control-transition group-open:rotate-180" />
      </summary>
      <div className="space-y-3 pb-4">{children}</div>
    </details>
  );
}

export function ProductFiltersForm({
  filters,
  onApply,
  onClear,
}: {
  filters: ProductFilters | null;
  onApply: (values: URLSearchParams) => void;
  onClear: () => void;
}) {
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => getCategories(signal),
    retry: false,
  });
  return (
    <form
      key={JSON.stringify(filters)}
      className="space-y-3 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new URLSearchParams();
        for (const [key, value] of new FormData(event.currentTarget))
          if (String(value).trim() !== '') values.append(key, String(value));
        onApply(values);
      }}
    >
      <label className="block pb-1 font-semibold">
        Tìm sản phẩm
        <input
          name="q"
          type="search"
          maxLength={100}
          className={controlClass}
          defaultValue={filters?.q ?? ''}
        />
      </label>
      <Group title={messages.category}>
        <label htmlFor="category-filter" className="sr-only">
          {messages.category}
        </label>
        <select
          id="category-filter"
          name="categoryId"
          className={`${controlClass} mt-0`}
          defaultValue={filters?.categoryId ?? ''}
          disabled={categories.isPending}
        >
          <option value="">{messages.allCategories}</option>
          {categories.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {categories.isError && (
          <p className="text-danger">
            {messages.categoriesError}{' '}
            <Button variant="ghost" onClick={() => void categories.refetch()}>
              {messages.retry}
            </Button>
          </p>
        )}
      </Group>
      <Group title="Dinh dưỡng">
        <label className="block font-medium">
          {messages.maxCalories}
          <input
            name="maxCalories"
            type="number"
            min="0"
            step="any"
            className={controlClass}
            defaultValue={filters?.maxCalories ?? ''}
          />
        </label>
        <label className="block font-medium">
          {messages.minProtein}
          <input
            name="minProtein"
            type="number"
            min="0"
            step="any"
            className={controlClass}
            defaultValue={filters?.minProtein ?? ''}
          />
        </label>
      </Group>
      <Group title="Loại trừ allergen">
        <fieldset>
          <legend className="sr-only">Loại trừ allergen</legend>
          <div className="flex flex-wrap gap-2">
            {allergenOptions.map((option) => (
              <label
                key={option.code}
                className="control-transition flex min-h-touch items-center gap-2 rounded-control border border-line-strong px-3 has-checked:border-ink has-checked:bg-lime"
              >
                <input
                  type="checkbox"
                  name="excludeAllergen"
                  value={option.code}
                  defaultChecked={
                    filters?.excludeAllergen?.includes(option.code) ?? false
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-ink-muted">
          Sản phẩm chưa đủ dữ liệu dinh dưỡng hoặc chưa xác minh allergen sẽ bị
          loại khi lọc.
        </p>
      </Group>
      <div className="sticky -bottom-4 flex flex-wrap gap-3 border-t border-line bg-surface py-3 md:static md:pb-0">
        <Button type="submit">{messages.applyFilters}</Button>
        <Button variant="outline" onClick={onClear}>
          {messages.clearFilters}
        </Button>
      </div>
    </form>
  );
}
