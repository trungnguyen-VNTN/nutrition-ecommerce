import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { useSession } from '@/features/auth/session';
import { SignInRequired } from '@/features/auth/auth-page';
import { AdminOrders } from './admin-orders';
import { AdminProducts } from './admin-products';
import { CategoriesPanel } from './categories-panel';

const sectionLink =
  'min-h-touch rounded-control px-3 py-3 text-primary-700 hover:bg-primary-100';

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
              className={`${sectionLink} font-semibold`}
            >
              Sản phẩm & tồn kho
            </a>
            <a href="#admin-categories" className={sectionLink}>
              Danh mục
            </a>
            <a href="#admin-orders" className={sectionLink}>
              Đơn hàng
            </a>
            <Link
              to="/products"
              className="inline-flex min-h-touch items-center gap-2 border-t border-neutral-200 px-3 py-3 text-sm text-neutral-700"
            >
              Xem cửa hàng <ArrowRight />
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
