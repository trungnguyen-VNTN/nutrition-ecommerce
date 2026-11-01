import { messages } from '@/app/messages.vi';

export function DataStatusBadge({ kind }: { kind: 'nutrition' | 'allergens' }) {
  return (
    <span className="inline-flex items-start gap-2 rounded-control border border-allergen-border bg-allergen-bg px-2 py-1 text-xs text-allergen-text">
      <span aria-hidden="true">!</span>
      <span>
        {kind === 'nutrition'
          ? messages.nutritionMissing
          : messages.allergensMissing}
      </span>
    </span>
  );
}
