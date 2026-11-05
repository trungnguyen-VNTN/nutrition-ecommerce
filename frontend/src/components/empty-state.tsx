import { useId, type ReactNode } from 'react';
import { Package } from '@phosphor-icons/react';
import { messages } from '@/app/messages.vi';
import { Button } from '@/components/ui/button';

// Empty list: icon, explanation and one next action (ui-guidelines §5).
export function EmptyState({
  title = messages.emptyTitle,
  description = messages.emptyDescription,
  icon = <Package />,
  action,
  onRefresh,
}: {
  title?: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  onRefresh?: () => void;
}) {
  const titleId = useId();
  return (
    <section
      className="rounded-card border border-dashed border-line-strong bg-surface px-6 py-10 text-center"
      aria-labelledby={titleId}
    >
      <span
        aria-hidden="true"
        className="mx-auto grid size-14 place-items-center rounded-pill bg-lime-soft text-3xl text-brand"
      >
        {icon}
      </span>
      <h2 id={titleId} className="mt-4 text-xl font-bold">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-copy text-ink-muted">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {action}
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh}>
            {messages.refresh}
          </Button>
        )}
      </div>
    </section>
  );
}
