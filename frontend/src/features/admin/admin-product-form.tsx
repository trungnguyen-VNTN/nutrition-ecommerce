import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { getCategories } from '@/features/products/api/products';
import { apiErrorMessage } from '@/lib/api/client';
import { adminInput, type AdminProduct } from './admin-api';

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
  if (categories.isError)
    return (
      <ErrorState
        description={apiErrorMessage(categories.error)}
        onRetry={() => void categories.refetch()}
      />
    );
  return (
    <form
      key={editing?.id ?? 'new'}
      className="space-y-4 rounded-card bg-neutral-100 p-4 md:p-6"
      onSubmit={(event) => {
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
      <label className="block">
        Tên sản phẩm
        <input
          className={adminInput}
          name="name"
          required
          maxLength={200}
          defaultValue={editing?.name}
        />
      </label>
      <label className="block">
        Mô tả
        <textarea
          className={adminInput}
          name="description"
          maxLength={2000}
          defaultValue={editing?.description ?? ''}
        />
      </label>
      <label className="block">
        Giá (VND)
        <input
          className={adminInput}
          type="number"
          name="price"
          min={0}
          max={9999999999.99}
          step="0.01"
          required
          defaultValue={editing?.price}
        />
      </label>
      <div>
        <label htmlFor="admin-category">Danh mục</label>
        <select
          id="admin-category"
          className={adminInput}
          name="category_id"
          required
          defaultValue={editing?.category_id ?? ''}
        >
          <option value="">Chọn danh mục</option>
          {categories.data?.map((category) => (
            <option value={category.id} key={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex min-h-touch items-center gap-3">
        <input
          name="active"
          type="checkbox"
          defaultChecked={editing?.active ?? false}
        />
        Cho phép hiển thị
      </label>
      <p className="text-sm text-neutral-700">
        Sản phẩm mới có tồn kho 0 và chưa xác minh dinh dưỡng/allergen.
      </p>
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
    </form>
  );
}
