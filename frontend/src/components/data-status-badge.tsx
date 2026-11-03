import { WarningCircle } from '@phosphor-icons/react';
import { messages } from '@/app/messages.vi';

export function DataStatusBadge({ kind }: { kind: 'nutrition' | 'allergens' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-control border border-allergen-border bg-allergen-bg px-2 py-1 text-xs text-allergen-text">
      <WarningCircle />
      <span>
        {kind === 'nutrition'
          ? messages.nutritionMissing
          : messages.allergensMissing}
      </span>
    </span>
  );
}
