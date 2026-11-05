import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package } from '@phosphor-icons/react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Note } from '@/components/ui/note';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage, requestJson } from '@/lib/api/client';
import {
  adminPageSize,
  adminProductSchema,
  adminRequest,
  type AdminProduct,
} from './admin-api';
import { AdminProductForm } from './admin-product-form';
import { AdminProductRow } from './admin-product-item';

export function AdminProducts() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-products', page],
    queryFn: async () =>
      z
        .array(adminProductSchema)
        .parse(await requestJson(`admin/products?page=${page}`)),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: adminRequest,
    onSuccess: async () => {
      setEditing(null);
      await cache.invalidateQueries({ queryKey: ['admin-products'] });
      await cache.invalidateQueries({ queryKey: ['products'] });
      await cache.invalidateQueries({ queryKey: ['product'] });
    },
  });
  const term = search.toLocaleLowerCase('vi');
  const visible = query.data?.filter((product) =>
    product.name.toLocaleLowerCase('vi').includes(term),
  );
  return (
    <section id="admin-products" className="scroll-mt-40 space-y-4">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Sản phẩm</h2>
        <p className="text-sm text-ink-muted">
          Chỉnh thông tin, cập nhật tồn kho và xác minh dữ liệu dinh dưỡng.
        </p>
      </div>
      {mutation.isError && (
        <Note tone="error" role="alert">
          {apiErrorMessage(mutation.error)}
        </Note>
      )}
      {mutation.isSuccess && (
        <Note tone="success" role="status">
          Đã lưu thay đổi sản phẩm.
        </Note>
      )}
      <Field label="Tìm tên trong trang hiện tại" className="max-w-md">
        {(control) => (
          <Input
            {...control}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nhập tên sản phẩm"
          />
        )}
      </Field>
      {query.isPending ? (
        <Skeleton className="h-64 rounded-card" />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="Chưa có sản phẩm."
          description="Thêm sản phẩm đầu tiên ở biểu mẫu bên dưới."
        />
      ) : (
        <>
          {/* Focusable so keyboard users can scroll the table on small screens. */}
          <div
            className="overflow-x-auto rounded-card border border-line bg-surface"
            role="region"
            aria-label="Bảng sản phẩm"
            tabIndex={0}
          >
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-sunken text-left text-xs text-ink-muted">
                <tr>
                  <th className="p-3 font-semibold">Sản phẩm</th>
                  <th className="p-3 font-semibold">Giá</th>
                  <th className="p-3 font-semibold">Trạng thái</th>
                  <th className="p-3 font-semibold">Tồn kho</th>
                  <th className="p-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visible?.map((product) => (
                  <AdminProductRow
                    key={product.id}
                    product={product}
                    busy={mutation.isPending}
                    onEdit={() => setEditing(product)}
                    onHide={() =>
                      mutation.mutate({
                        path: `admin/products/${product.id}`,
                        method: 'DELETE',
                      })
                    }
                    onStock={(stock) =>
                      mutation.mutate({
                        path: `admin/products/${product.id}/stock`,
                        method: 'PATCH',
                        body: { stock },
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
          {visible?.length === 0 && (
            <p role="status" className="rounded-card bg-sunken p-4 text-sm">
              Không tìm thấy tên sản phẩm trong trang này.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Trang trước
            </Button>
            <Button
              variant="outline"
              disabled={query.data.length < adminPageSize}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </Button>
            <span className="text-sm text-ink-muted">Trang {page + 1}</span>
          </div>
        </>
      )}
      <h3 className="pt-4 text-xl font-bold">
        {editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      </h3>
      <AdminProductForm
        editing={editing}
        saving={mutation.isPending}
        onCancel={() => setEditing(null)}
        onSave={(body) =>
          mutation.mutate({
            path: editing ? `admin/products/${editing.id}` : 'admin/products',
            method: editing ? 'PUT' : 'POST',
            body,
          })
        }
      />
    </section>
  );
}
