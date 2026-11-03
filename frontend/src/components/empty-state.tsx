import { Package } from '@phosphor-icons/react';
import { messages } from '@/app/messages.vi';
import { Button } from '@/components/ui/button';

export function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <section
      className="rounded-card border border-neutral-200 p-8 text-center"
      aria-labelledby="empty-title"
    >
      <Package className="icon mx-auto text-4xl text-primary-700" />
      <h2 id="empty-title" className="mt-4 text-xl font-semibold">
        {messages.emptyTitle}
      </h2>
      <p className="mt-2 text-neutral-700">{messages.emptyDescription}</p>
      <Button className="mt-6" variant="secondary" onClick={onRefresh}>
        {messages.refresh}
      </Button>
    </section>
  );
}
