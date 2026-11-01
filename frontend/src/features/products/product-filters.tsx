import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { messages } from '@/app/messages.vi';
import { getCategories } from './api/products';
import { allergenOptions, type ProductFilters } from './api/filters';

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
  const control =
    'mt-2 min-h-touch w-full rounded-control border border-neutral-200 bg-neutral-50 px-3 text-base';
  return (
    <form
      key={JSON.stringify(filters)}
      className="grid gap-4 rounded-card border border-neutral-200 p-4 md:grid-cols-3 lg:flex lg:flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new URLSearchParams();
        for (const [key, value] of new FormData(event.currentTarget))
          if (String(value).trim() !== '') values.append(key, String(value));
        onApply(values);
      }}
    >
      <label className="text-sm font-medium md:col-span-3">
        Tìm sản phẩm
        <input
          name="q"
          type="search"
          maxLength={100}
          className={control}
          defaultValue={filters?.q ?? ''}
        />
      </label>
      <div className="text-sm font-medium">
        <label htmlFor="category-filter">{messages.category}</label>
        <select
          id="category-filter"
          name="categoryId"
          className={control}
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
      </div>
      <label className="text-sm font-medium">
        {messages.maxCalories}
        <input
          name="maxCalories"
          type="number"
          min="0"
          step="any"
          className={control}
          defaultValue={filters?.maxCalories ?? ''}
        />
      </label>
      <label className="text-sm font-medium">
        {messages.minProtein}
        <input
          name="minProtein"
          type="number"
          min="0"
          step="any"
          className={control}
          defaultValue={filters?.minProtein ?? ''}
        />
      </label>
      <fieldset className="md:col-span-3">
        <legend className="text-sm font-medium">Loại trừ allergen</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {allergenOptions.map((option) => (
            <label
              key={option.code}
              className="flex min-h-touch items-center gap-2 text-sm"
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
        <p className="text-sm text-neutral-700">
          Sản phẩm chưa đủ dữ liệu dinh dưỡng hoặc chưa xác minh allergen sẽ bị
          loại khi lọc.
        </p>
      </fieldset>
      <div className="flex flex-wrap gap-3 md:col-span-3">
        <Button type="submit">{messages.applyFilters}</Button>
        <Button variant="secondary" onClick={onClear}>
          {messages.clearFilters}
        </Button>
      </div>
      {categories.isError && (
        <p className="text-sm text-danger md:col-span-3">
          {messages.categoriesError}{' '}
          <Button variant="ghost" onClick={() => void categories.refetch()}>
            {messages.retry}
          </Button>
        </p>
      )}
    </form>
  );
}
