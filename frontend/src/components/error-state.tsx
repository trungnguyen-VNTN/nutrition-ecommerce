import { useId } from 'react';
import { HourglassMedium, WarningOctagon } from '@phosphor-icons/react';
import { messages } from '@/app/messages.vi';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';

// Error with a recovery path. A 429 is a quota/rate limit, not a failure, so it reads differently.
export function ErrorState({
  description,
  onRetry,
  error,
}: {
  description: string;
  onRetry: () => void;
  error?: unknown;
}) {
  const titleId = useId();
  const limited = error instanceof ApiError && error.status === 429;
  const Glyph = limited ? HourglassMedium : WarningOctagon;
  return (
    <section
      className="rounded-card border border-danger/40 bg-danger-tint px-6 py-8"
      aria-labelledby={titleId}
    >
      <div role="alert" className="flex items-start gap-3">
        <Glyph className="icon mt-1 text-2xl text-danger" />
        <div>
          <h2 id={titleId} className="text-xl font-bold">
            {limited ? messages.rateLimitedTitle : messages.errorTitle}
          </h2>
          <p className="mt-2 text-ink">{description}</p>
          {limited && (
            <p className="mt-1 text-sm text-ink-muted">
              {messages.rateLimitedHint}
            </p>
          )}
        </div>
      </div>
      <Button className="mt-6" variant="outline" onClick={onRetry}>
        {messages.retry}
      </Button>
    </section>
  );
}
