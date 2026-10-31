import { CategoriesPanel } from './categories-panel';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/session';
import { SignInRequired } from '@/features/auth/auth-page';
import { getCategories } from '@/features/products/api/products';
import { apiErrorMessage, requestJson } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { statusText } from '@/features/commerce/api';

const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  currency: z.string(),
  stock: z.number(),
  category_id: z.number().nullable(),
  active: z.boolean(),
});
const orderSchema = z.object({
  id: z.number(),
  status: z.enum(['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  total: z.number(),
  currency: z.string(),
});
type Product = z.infer<typeof productSchema>;
export function AdminPage() {
  const identity = useSession();
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold text-primary-700">
          Nutrition · Không gian vận hành
        </p>
        <h1 className="text-3xl font-semibold">Quản trị</h1>
        <p className="max-w-copy text-neutral-700">
          Quản lý danh mục, giữ dữ liệu sản phẩm rõ ràng và theo dõi từng bước
          xử lý đơn hàng.
        </p>
      </header>
      {!identity ? (
        <SignInRequired />
      ) : !identity.admin ? (
        <p role="alert">Bạn không có quyền quản trị.</p>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-4">
          <nav
            aria-label="Quản trị cửa hàng"
            className="flex flex-wrap gap-2 rounded-card bg-primary-50 p-4 lg:flex-col"
          >
            <a
              href="#admin-products"
              className="min-h-touch rounded-control px-3 py-3 font-semibold text-primary-700 hover:bg-primary-100"
            >
              Sản phẩm & tồn kho
            </a>
            <a
              href="#admin-categories"
              className="min-h-touch rounded-control px-3 py-3 text-primary-700 hover:bg-primary-100"
            >
              Danh mục
            </a>
            <a
              href="#admin-orders"
              className="min-h-touch rounded-control px-3 py-3 text-primary-700 hover:bg-primary-100"
            >
              Đơn hàng
            </a>
            <Link
              to="/products"
              className="min-h-touch border-t border-neutral-200 px-3 py-3 text-sm text-neutral-700"
            >
              Xem cửa hàng →
            </Link>
          </nav>
          <div className="min-w-0 space-y-12 lg:col-span-3">
            <AdminProducts />
            <CategoriesPanel />
            <AdminOrders />
          </div>
        </div>
      )}
    </section>
  );
}
function AdminProducts() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-products', page],
    queryFn: async () =>
      z
        .array(productSchema)
        .parse(await requestJson(`admin/products?page=${page}`)),
    retry: false,
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => getCategories(signal),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: ({
      path,
      method,
      body,
    }: {
      path: string;
      method: string;
      body?: object;
    }) =>
      requestJson(path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      }),
    onSuccess: async () => {
      setEditing(null);
      await cache.invalidateQueries({ queryKey: ['admin-products'] });
      await cache.invalidateQueries({ queryKey: ['products'] });
      await cache.invalidateQueries({ queryKey: ['product'] });
    },
  });
  const input =
    'mt-2 block min-h-touch w-full rounded-control border border-neutral-200 bg-neutral-50 px-3';
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
          className={input}
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
            {query.data
              .filter((product) =>
                product.name
                  .toLocaleLowerCase('vi')
                  .includes(search.toLocaleLowerCase('vi')),
              )
              .map((product) => (
                <li
                  key={product.id}
                  className="rounded-card border border-neutral-200 p-4 md:p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                      <p className="mt-2 font-semibold text-primary-700">
                        {formatMoney(product.price, product.currency)}
                      </p>
                    </div>
                    <span className="rounded-pill bg-neutral-100 px-3 py-2 text-xs font-medium">
                      {product.active ? 'Đang bán' : 'Đã ẩn'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => setEditing(product)}
                    >
                      Sửa
                    </Button>
                    <Button asChild variant="ghost">
                      <Link to={`/admin/products/${product.id}`}>
                        Dinh dưỡng và allergen
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={mutation.isPending || !product.active}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Ẩn sản phẩm “${product.name}” khỏi cửa hàng?`,
                          )
                        )
                          return;
                        mutation.mutate({
                          path: `admin/products/${product.id}`,
                          method: 'DELETE',
                        });
                      }}
                    >
                      Ẩn
                    </Button>
                  </div>
                  <form
                    className="flex flex-wrap items-end gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      mutation.mutate({
                        path: `admin/products/${product.id}/stock`,
                        method: 'PATCH',
                        body: {
                          stock: Number(
                            new FormData(event.currentTarget).get('stock'),
                          ),
                        },
                      });
                    }}
                  >
                    <label>
                      Tồn kho
                      <input
                        key={product.stock}
                        className={input}
                        name="stock"
                        type="number"
                        required
                        min={0}
                        max={1000000}
                        defaultValue={product.stock}
                      />
                    </label>
                    <Button type="submit" disabled={mutation.isPending}>
                      Lưu tồn kho
                    </Button>
                  </form>
                </li>
              ))}
          </ul>
          {query.data.length > 0 &&
            !query.data.some((product) =>
              product.name
                .toLocaleLowerCase('vi')
                .includes(search.toLocaleLowerCase('vi')),
            ) && (
              <p role="status" className="rounded-card bg-neutral-100 p-4">
                Không tìm thấy tên sản phẩm trong trang này.
              </p>
            )}
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
              Trang trước
            </Button>
            <Button
              disabled={query.data.length < 20}
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
      {categories.isError ? (
        <ErrorState
          description={apiErrorMessage(categories.error)}
          onRetry={() => void categories.refetch()}
        />
      ) : (
        <form
          key={editing?.id ?? 'new'}
          className="space-y-4 rounded-card bg-neutral-100 p-4 md:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            mutation.mutate({
              path: editing ? `admin/products/${editing.id}` : 'admin/products',
              method: editing ? 'PUT' : 'POST',
              body: {
                name: data.get('name'),
                description: data.get('description'),
                price: Number(data.get('price')),
                category_id: Number(data.get('category_id')),
                active: data.get('active') === 'on',
              },
            });
          }}
        >
          <label className="block">
            Tên sản phẩm
            <input
              className={input}
              name="name"
              required
              maxLength={200}
              defaultValue={editing?.name}
            />
          </label>
          <label className="block">
            Mô tả
            <textarea
              className={input}
              name="description"
              maxLength={2000}
              defaultValue={editing?.description ?? ''}
            />
          </label>
          <label className="block">
            Giá (VND)
            <input
              className={input}
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
              className={input}
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
            loading={mutation.isPending}
            disabled={!categories.data?.length}
          >
            Lưu sản phẩm
          </Button>
          {editing && (
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Hủy sửa
            </Button>
          )}
        </form>
      )}
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
function AdminOrders() {
  const [page, setPage] = useState(0);
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: async () =>
      z
        .array(orderSchema)
        .parse(await requestJson(`admin/orders?page=${page}`)),
    retry: false,
  });
  const change = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      requestJson(`admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['admin-orders'] }),
  });
  const next = {
    PLACED: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  } as const;
  return (
    <section id="admin-orders" className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Đơn hàng</h2>
        <p className="text-sm text-neutral-700">
          Mở chi tiết để kiểm tra sản phẩm và thông tin nhận hàng trước khi cập
          nhật trạng thái.
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
        <>
          {query.data.length === 0 && <p>Chưa có đơn hàng.</p>}
          <ul className="space-y-4">
            {query.data.map((order) => (
              <li
                key={order.id}
                className="space-y-3 rounded-card border border-neutral-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="text-primary-700 underline"
                  >
                    Đơn #{order.id}
                  </Link>
                  <span className="rounded-pill bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700">
                    {statusText[order.status]}
                  </span>
                  <span className="font-semibold">
                    {formatMoney(order.total, order.currency)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {next[order.status].map((status) => (
                    <Button
                      key={status}
                      variant="secondary"
                      disabled={change.isPending}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Chuyển đơn #${order.id} sang “${statusText[status]}”?`,
                          )
                        )
                          return;
                        change.mutate({ id: order.id, status });
                      }}
                    >
                      {statusText[status]}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
              Trang trước
            </Button>
            <Button
              disabled={query.data.length < 20}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </Button>
          </div>
        </>
      )}
      {change.isError && <p role="alert">{apiErrorMessage(change.error)}</p>}
      {change.isSuccess && (
        <p
          role="status"
          className="rounded-control bg-primary-50 p-4 text-primary-700"
        >
          Đã cập nhật trạng thái đơn hàng.
        </p>
      )}
    </section>
  );
}
