import { messages } from '@/app/messages.vi';
import { Button } from '@/components/ui/button';

export function ErrorState({
  description,
  onRetry,
}: {
  description: string;
  onRetry: () => void;
}) {
  return (
    <section
      className="rounded-card border border-neutral-200 p-8"
      aria-labelledby="error-title"
    >
      <div role="alert">
        <h2 id="error-title" className="text-xl font-semibold">
          {messages.errorTitle}
        </h2>
        <p className="mt-2 text-neutral-700">{description}</p>
      </div>
      <Button className="mt-6" onClick={onRetry}>
        {messages.retry}
      </Button>
    </section>
  );
}
