import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Note } from '@/components/ui/note';
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
  return (
    <section id="admin-categories" className="scroll-mt-40 space-y-4">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Danh mục</h2>
        <p className="text-sm text-ink-muted">
          Sắp xếp cửa hàng để khách tìm đúng nhóm thực phẩm.
        </p>
      </div>
      {save.isError && (
        <Note tone="error" role="alert">
          {apiErrorMessage(save.error)}
        </Note>
      )}
      {save.isSuccess && (
        <Note tone="success" role="status">
          Đã lưu thay đổi danh mục.
        </Note>
      )}
      {query.isPending ? (
        <Skeleton className="h-32 rounded-card" />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {query.data.length === 0 && (
            <li className="p-4 text-ink-muted">
              Chưa có danh mục. Tạo danh mục đầu tiên ở biểu mẫu bên dưới.
            </li>
          )}
          {query.data.map((category) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center gap-2 p-3"
            >
              <span className="min-w-40 flex-1 font-bold">{category.name}</span>
              <Button variant="secondary" onClick={() => setEditing(category)}>
                Sửa {category.name}
              </Button>
              <Button
                variant="ghost"
                className="text-danger"
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
      <Card
        as="form"
        key={`${editing?.id ?? 'new'}-${version}`}
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          save.mutate({
            id: editing?.id,
            body: { name: data.get('name'), slug: data.get('slug') },
          });
        }}
      >
        <h3 className="text-xl font-bold sm:col-span-2">
          {editing ? 'Chỉnh sửa danh mục' : 'Danh mục mới'}
        </h3>
        <Field label="Tên danh mục" required>
          {(control) => (
            <Input
              {...control}
              name="name"
              maxLength={100}
              defaultValue={editing?.name}
            />
          )}
        </Field>
        <Field
          label="Slug"
          required
          hint="Chữ thường không dấu, số và dấu gạch nối. Ví dụ: ngu-coc."
        >
          {(control) => (
            <Input
              {...control}
              name="slug"
              maxLength={100}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              defaultValue={editing?.slug}
            />
          )}
        </Field>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <Button type="submit" loading={save.isPending}>
            {editing ? 'Lưu danh mục' : 'Tạo danh mục'}
          </Button>
          {editing && (
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Hủy sửa
            </Button>
          )}
        </div>
      </Card>
    </section>
  );
}
