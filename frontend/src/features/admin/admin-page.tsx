import { useSession } from '@/features/auth/session';
import { SignInRequired } from '@/features/auth/auth-page';
import { AdminOrders } from './admin-orders';
import { AdminProducts } from './admin-products';
import { CategoriesPanel } from './categories-panel';

// Section navigation lives in AdminShell (components/layout/admin-shell.tsx).
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
        <div className="space-y-12">
          <AdminProducts />
          <CategoriesPanel />
          <AdminOrders />
        </div>
      )}
    </section>
  );
}
