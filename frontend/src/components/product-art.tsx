import { messages } from '@/app/messages.vi';
import { cn } from '@/lib/utils';

const tones = ['green', 'grain', 'warm'] as const;

// Shared placeholder until real product photos exist; one drawing for card and detail.
export function ProductArt({
  name,
  index = 0,
  className,
}: {
  name: string;
  index?: number;
  className?: string;
}) {
  return (
    <div className={cn('product-art', className)} data-tone={tones[index % 3]}>
      <svg
        viewBox="0 0 120 140"
        role="img"
        aria-label={messages.illustration(name)}
      >
        <path
          d="M28 12h64l6 116H22Z M28 24h64 M25 112h70"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="60" cy="68" r="26" fill="currentColor" opacity="0.1" />
        <path
          d="M60 88V52m0 12c-15 0-18-12-18-12 14 0 18 12 18 12Zm0 12c15 0 18-12 18-12-14 0-18 12-18 12Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="product-art-caption">
        {messages.sampleImage} · {messages.noPhoto}
      </span>
    </div>
  );
}
