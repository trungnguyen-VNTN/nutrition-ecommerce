import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { ErrorState } from '@/components/error-state';
import { getCategories } from '@/features/products/api/products';
import { apiErrorMessage } from '@/lib/api/client';
import type { AdminProduct } from './admin-api';

export function AdminProductForm({
  editing,
  saving,
  onSave,
  onCancel,
}: {
  editing: AdminProduct | null;
  saving: boolean;
  onSave: (body: object) => void;
  onCancel: () => void;
}) {
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => getCategories(signal),
    retry: false,
  });
  const name = useRef<HTMLInputElement>(null);
  // The form sits below the table: bring it to the user when "Sửa" is pressed.
  useEffect(() => {
    if (editing) name.current?.focus();
  }, [editing]);
  if (categories.isError)
    return (
      <ErrorState
        description={apiErrorMessage(categories.error)}
        error={categories.error}
        onRetry={() => void categories.refetch()}
      />
    );
  return (
    <Card
      as="form"
      key={editing?.id ?? 'new'}
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSave({
          name: data.get('name'),
          description: data.get('description'),
          price: Number(data.get('price')),
          category_id: Number(data.get('category_id')),
          active: data.get('active') === 'on',
        });
      }}
    >
      <Field label="Tên sản phẩm" required className="sm:col-span-2">
        {(control) => (
          <Input
            {...control}
            ref={name}
            name="name"
            maxLength={200}
            defaultValue={editing?.name}
          />
        )}
      </Field>
      <Field label="Mô tả" className="sm:col-span-2">
        {(control) => (
          <Textarea
            {...control}
            name="description"
            maxLength={2000}
            defaultValue={editing?.description ?? ''}
          />
        )}
      </Field>
      <Field label="Giá (VND)" required>
        {(control) => (
          <Input
            {...control}
            type="number"
            name="price"
            min={0}
            max={9999999999.99}
            step="0.01"
            defaultValue={editing?.price}
          />
        )}
      </Field>
      <Field label="Danh mục" required>
        {(control) => (
          <Select
            {...control}
            name="category_id"
            defaultValue={editing?.category_id ?? ''}
          >
            <option value="">Chọn danh mục</option>
            {categories.data?.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <label className="flex min-h-touch items-center gap-3 text-sm font-semibold sm:col-span-2">
        <input
          name="active"
          type="checkbox"
          defaultChecked={editing?.active ?? false}
        />
        Cho phép hiển thị
      </label>
      <p className="text-sm text-ink-muted sm:col-span-2">
        Sản phẩm mới có tồn kho 0 và chưa xác minh dinh dưỡng/allergen.
      </p>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <Button
          type="submit"
          loading={saving}
          disabled={!categories.data?.length}
        >
          Lưu sản phẩm
        </Button>
        {editing && (
          <Button variant="ghost" onClick={onCancel}>
            Hủy sửa
          </Button>
        )}
      </div>
    </Card>
  );
}
