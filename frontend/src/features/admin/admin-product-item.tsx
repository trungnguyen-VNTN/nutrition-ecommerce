import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import { adminInput, type AdminProduct } from './admin-api';

export function AdminProductItem({
  product,
  busy,
  onEdit,
  onHide,
  onStock,
}: {
  product: AdminProduct;
  busy: boolean;
  onEdit: () => void;
  onHide: () => void;
  onStock: (stock: number) => void;
}) {
  return (
    <li className="space-y-4 rounded-card border border-neutral-200 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <p className="mt-2 font-semibold tabular-nums text-primary-700">
            {formatMoney(product.price, product.currency)}
          </p>
        </div>
        <span className="rounded-pill bg-neutral-100 px-3 py-2 text-xs font-medium">
          {product.active ? 'Đang bán' : 'Đã ẩn'}
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onEdit}>
          Sửa
        </Button>
        <Button asChild variant="ghost">
          <Link to={`/admin/products/${product.id}`}>
            Dinh dưỡng và allergen
          </Link>
        </Button>
        <Button
          variant="ghost"
          disabled={busy || !product.active}
          onClick={() => {
            if (window.confirm(`Ẩn sản phẩm “${product.name}” khỏi cửa hàng?`))
              onHide();
          }}
        >
          Ẩn
        </Button>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onStock(Number(new FormData(event.currentTarget).get('stock')));
        }}
      >
        <label>
          Tồn kho
          <input
            key={product.stock}
            className={adminInput}
            name="stock"
            type="number"
            required
            min={0}
            max={1000000}
            defaultValue={product.stock}
          />
        </label>
        <Button type="submit" disabled={busy}>
          Lưu tồn kho
        </Button>
      </form>
    </li>
  );
}
