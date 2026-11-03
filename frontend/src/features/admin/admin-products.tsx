import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage, requestJson } from '@/lib/api/client';
import {
  adminInput,
  adminPageSize,
  adminProductSchema,
  adminRequest,
  type AdminProduct,
} from './admin-api';
import { AdminProductForm } from './admin-product-form';
import { AdminProductItem } from './admin-product-item';

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
    <section id="admin-products" className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Sản phẩm</h2>
        <p className="text-sm text-neutral-700">
          Chỉnh thông tin, cập nhật tồn kho và xác minh dữ liệu dinh dưỡng.
        </p>
      </div>
      <label className="block text-sm font-medium">
        Tìm tên trong trang hiện tại
        <input
          type="search"
          className={adminInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nhập tên sản phẩm"
        />
      </label>
      {query.isPending ? (
        <Skeleton className="h-16" />
      ) : query.isError ? (
        <ErrorState
          description={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.data.length === 0 && <p>Chưa có sản phẩm.</p>}
          <ul className="space-y-4">
            {visible?.map((product) => (
              <AdminProductItem
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
          </ul>
          {query.data.length > 0 && visible?.length === 0 && (
            <p role="status" className="rounded-card bg-neutral-100 p-4">
              Không tìm thấy tên sản phẩm trong trang này.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
              Trang trước
            </Button>
            <Button
              disabled={query.data.length < adminPageSize}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </Button>
            <span className="text-sm text-neutral-700">Trang {page + 1}</span>
          </div>
        </>
      )}
      <h3 className="text-lg font-semibold">
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
      {mutation.isError && (
        <p role="alert">{apiErrorMessage(mutation.error)}</p>
      )}
      {mutation.isSuccess && (
        <p
          role="status"
          className="rounded-control bg-primary-50 p-4 text-primary-700"
        >
          Đã lưu thay đổi sản phẩm.
        </p>
      )}
    </section>
  );
}
