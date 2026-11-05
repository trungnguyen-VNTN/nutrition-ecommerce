import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { messages } from '@/app/messages.vi';
import type { Product } from '@/lib/api/catalog.types';
import { Tag } from '@/components/ui/tag';
import { DataStatusBadge } from './data-status-badge';

// "Không ghi nhận allergen" only when verified; unverified always reads as unknown.
export function AllergenBadge({ product }: { product: Product }) {
  if (!product.allergens_verified || product.allergens === null)
    return <DataStatusBadge kind="allergens" />;
  if (product.allergens.length === 0)
    return (
      <Tag tone="success" icon={<CheckCircle />}>
        {messages.noAllergens}
      </Tag>
    );
  return (
    <ul className="flex flex-wrap gap-2">
      {product.allergens.map((allergen) => (
        <li key={allergen.code}>
          <Tag tone="warning" icon={<WarningCircle />} className="text-sm">
            {allergen.kind === 'may_contain'
              ? messages.mayContain
              : messages.contains}
            : {allergen.name}
          </Tag>
        </li>
      ))}
    </ul>
  );
}
