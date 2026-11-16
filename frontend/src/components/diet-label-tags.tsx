import { Tag } from '@/components/ui/tag';
import { dietLabels, type DietLabelCode } from '@/lib/diet-labels';

// Compact list of derived nutrition labels. With `max`, extra labels collapse into a "+n" count
// whose full list is available to screen readers and on hover.
export function DietLabelTags({
  labels,
  max,
}: {
  labels: DietLabelCode[];
  max?: number;
}) {
  if (labels.length === 0) return null;
  const shown = max === undefined ? labels : labels.slice(0, max);
  const hidden = labels.slice(shown.length);
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Đặc điểm dinh dưỡng">
      {shown.map((code) => (
        <li key={code}>
          <Tag tone="lime">{dietLabels[code].label}</Tag>
        </li>
      ))}
      {hidden.length > 0 && (
        <li title={hidden.map((code) => dietLabels[code].label).join(', ')}>
          <Tag>
            +{hidden.length}
            <span className="sr-only">
              : {hidden.map((code) => dietLabels[code].label).join(', ')}
            </span>
          </Tag>
        </li>
      )}
    </ul>
  );
}
