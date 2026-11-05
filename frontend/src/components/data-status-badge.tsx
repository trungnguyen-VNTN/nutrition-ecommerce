import { WarningCircle } from '@phosphor-icons/react';
import { messages } from '@/app/messages.vi';
import { Tag } from '@/components/ui/tag';

// Dashed warning label for missing / unverified data (fail-closed, never implies "none").
export function DataStatusBadge({ kind }: { kind: 'nutrition' | 'allergens' }) {
  return (
    <Tag tone="warning" dashed icon={<WarningCircle />}>
      {kind === 'nutrition'
        ? messages.nutritionMissing
        : messages.allergensMissing}
    </Tag>
  );
}
