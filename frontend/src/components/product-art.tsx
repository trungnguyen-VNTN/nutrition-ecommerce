import { messages } from '@/app/messages.vi';
import { cn } from '@/lib/utils';

// Rotate through macro tints so a grid of placeholders does not look uniform.
const tones = [
  'bg-lime-soft text-brand',
  'bg-carb-tint text-ink',
  'bg-protein-tint text-ink',
  'bg-fiber-tint text-brand',
  'bg-fat-tint text-ink',
] as const;

// Placeholder until real product photos exist (no S3 upload yet); one drawing for card and detail.
export function ProductArt({
  name,
  index = 0,
  caption = true,
  className,
}: {
  name: string;
  index?: number;
  caption?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative grid place-items-center overflow-hidden',
        tones[index % tones.length],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute aspect-square w-3/5 rounded-pill border border-current opacity-15 shadow-[0_0_0_24px_rgb(255_255_255/0.25)]"
      />
      <svg
        viewBox="0 0 120 140"
        role="img"
        aria-label={messages.illustration(name)}
        className="relative h-3/5 w-auto"
      >
        <path
          d="M28 12h64l6 116H22Z M28 24h64 M25 112h70"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="60" cy="68" r="26" fill="currentColor" opacity="0.12" />
        <path
          d="M60 88V52m0 12c-15 0-18-12-18-12 14 0 18 12 18 12Zm0 12c15 0 18-12 18-12-14 0-18 12-18 12Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {caption && (
        <span className="absolute bottom-2 rounded-pill bg-surface/85 px-2 text-xs text-ink">
          {messages.sampleImage} · {messages.noPhoto}
        </span>
      )}
    </div>
  );
}
