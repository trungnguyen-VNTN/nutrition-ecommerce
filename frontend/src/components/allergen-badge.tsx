import { messages } from '@/app/messages.vi';
import type { Product } from '@/lib/api/catalog.types';
import { DataStatusBadge } from './data-status-badge';

export function AllergenBadge({ product }: { product: Product }) {
  if (!product.allergens_verified || product.allergens === null)
    return <DataStatusBadge kind="allergens" />;
  if (product.allergens.length === 0)
    return <p className="text-neutral-700">{messages.noAllergens}</p>;
  return (
    <ul className="flex flex-wrap gap-3">
      {product.allergens.map((allergen) => (
        <li
          key={allergen.code}
          className="rounded-control border border-allergen-border bg-allergen-bg px-3 py-2 text-sm text-allergen-text"
        >
          <span aria-hidden="true">! </span>
          {allergen.kind === 'may_contain'
            ? messages.mayContain
            : messages.contains}
          : {allergen.name}
        </li>
      ))}
    </ul>
  );
}
