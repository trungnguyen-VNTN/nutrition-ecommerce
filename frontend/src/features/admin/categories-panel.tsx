import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategories } from '@/features/products/api/products';
import { requestJson, apiErrorMessage } from '@/lib/api/client';
import type { Category } from '@/lib/api/catalog.types';

export function CategoriesPanel() {
  const [editing, setEditing] = useState<Category | null>(null);
  const [version, setVersion] = useState(0);
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => getCategories(signal),
    retry: false,
  });
  const save = useMutation({
    mutationFn: ({ id, body }: { id?: number; body?: object }) =>
      requestJson(id ? `admin/categories/${id}` : 'admin/categories', {
        method: !body ? 'DELETE' : id ? 'PUT' : 'POST',
        body: body ? JSON.stringify(body) : undefined,
      }),
    onSuccess: async () => {
      setEditing(null);
      setVersion((value) => value + 1);
      await cache.invalidateQueries({ queryKey: ['categories'] });
      await cache.invalidateQueries({ queryKey: ['products'] });
      await cache.invalidateQueries({ queryKey: ['product'] });
    },
  });
  const input =
    'mt-2 block min-h-touch w-full rounded-control border border-neutral-200 bg-neutral-50 px-3';
  return (
    <section id="admin-categories" className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Danh mục</h2>
        <p className="text-sm text-neutral-700">
          Sắp xếp cửa hàng để khách tìm đúng nhóm thực phẩm.
        </p>
      </div>
      {query.isPending ? (
        <Skeleton className="h-16" />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <ul className="space-y-3">
          {query.data.length === 0 && (
            <li className="rounded-card bg-neutral-100 p-4 text-neutral-700">
              Chưa có danh mục. Tạo danh mục đầu tiên ở biểu mẫu bên dưới.
            </li>
          )}
          {query.data.map((category) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center gap-3 rounded-card border border-neutral-200 p-4"
            >
              <span className="flex-1 font-semibold">{category.name}</span>
              <Button variant="secondary" onClick={() => setEditing(category)}>
                Sửa {category.name}
              </Button>
              <Button
                variant="ghost"
                disabled={save.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Xóa danh mục “${category.name}”? Chỉ xóa được danh mục không còn sản phẩm.`,
                    )
                  )
                    save.mutate({ id: category.id });
                }}
              >
                Xóa {category.name}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        key={`${editing?.id ?? 'new'}-${version}`}
        className="space-y-4 rounded-card bg-neutral-100 p-4 md:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          save.mutate({
            id: editing?.id,
            body: { name: data.get('name'), slug: data.get('slug') },
          });
        }}
      >
        <h3 className="text-lg font-semibold">
          {editing ? 'Chỉnh sửa danh mục' : 'Danh mục mới'}
        </h3>
        <label className="block">
          Tên danh mục
          <input
            className={input}
            name="name"
            required
            maxLength={100}
            defaultValue={editing?.name}
          />
        </label>
        <label className="block">
          Slug
          <input
            className={input}
            name="slug"
            required
            maxLength={100}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={editing?.slug}
            aria-describedby="category-slug-help"
          />
        </label>
        <p id="category-slug-help" className="text-sm text-neutral-700">
          Chữ thường không dấu, số và dấu gạch nối. Ví dụ: ngu-coc. Chỉ xóa được
          danh mục không còn sản phẩm.
        </p>
        <Button type="submit" loading={save.isPending}>
          {editing ? 'Lưu danh mục' : 'Tạo danh mục'}
        </Button>
        {editing && (
          <Button variant="ghost" onClick={() => setEditing(null)}>
            Hủy sửa
          </Button>
        )}
      </form>
      {save.isError && <p role="alert">{apiErrorMessage(save.error)}</p>}
      {save.isSuccess && <p role="status">Đã lưu thay đổi danh mục.</p>}
    </section>
  );
}
