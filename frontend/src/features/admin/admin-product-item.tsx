import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Tag } from '@/components/ui/tag';
import { formatMoney } from '@/lib/format';
import type { AdminProduct } from './admin-api';

export function AdminProductRow({
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
    <tr className="border-t border-line align-middle">
      <td className="p-3">
        <h3 className="font-bold">{product.name}</h3>
      </td>
      <td className="p-3 font-semibold whitespace-nowrap tabular-nums">
        {formatMoney(product.price, product.currency)}
      </td>
      <td className="p-3">
        <Tag tone={product.active ? 'success' : 'neutral'}>
          {product.active ? 'Đang bán' : 'Đã ẩn'}
        </Tag>
      </td>
      <td className="p-3">
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onStock(Number(new FormData(event.currentTarget).get('stock')));
          }}
        >
          <label className="sr-only" htmlFor={`stock-${product.id}`}>
            Tồn kho {product.name}
          </label>
          <Input
            id={`stock-${product.id}`}
            key={product.stock}
            className="mt-0 w-24 tabular-nums"
            name="stock"
            type="number"
            required
            min={0}
            max={1000000}
            defaultValue={product.stock}
          />
          <Button
            type="submit"
            variant="outline"
            className="whitespace-nowrap"
            disabled={busy}
          >
            Lưu tồn kho
          </Button>
        </form>
      </td>
      <td className="p-3">
        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
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
            className="text-danger"
            disabled={busy || !product.active}
            onClick={() => {
              if (
                window.confirm(`Ẩn sản phẩm “${product.name}” khỏi cửa hàng?`)
              )
                onHide();
            }}
          >
            Ẩn
          </Button>
        </div>
      </td>
    </tr>
  );
}
