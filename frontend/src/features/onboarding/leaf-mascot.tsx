import { cn } from '@/lib/utils';

export type MascotMood = 'wave' | 'point' | 'idle' | 'cheer';

/**
 * "Lá", the onboarding guide: the brand leaf from the favicon (lime on ink) with a face.
 * Decorative only (aria-hidden): every step also says its message in text.
 */
export function LeafMascot({
  mood = 'idle',
  className,
}: {
  mood?: MascotMood;
  className?: string;
}) {
  const happy = mood === 'cheer' || mood === 'wave';
  // Eyes look toward the highlighted control when pointing.
  const look = mood === 'point' ? 6 : 0;
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
      className={cn('leaf-mascot', `leaf-mascot--${mood}`, className)}
    >
      <rect width="120" height="120" rx="30" fill="var(--ink)" />
      <g className="leaf-mascot__body">
        {/* Stem and leaf blade, pointing up-right like the favicon. */}
        <path
          d="M30 92 L20 102"
          stroke="var(--lime)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M30 92 C20 56 44 22 96 18 C101 66 74 96 30 92 Z"
          fill="var(--lime)"
        />
        {/* Midrib, kept short so the face stays clear. */}
        <path
          d="M36 86 C46 76 52 70 58 64"
          stroke="var(--lime-strong)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {happy ? (
          <>
            <path
              d="M52 50 q5 -6 10 0"
              stroke="var(--ink)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M70 44 q5 -6 10 0"
              stroke="var(--ink)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            <circle cx={57 + look} cy="50" r="4.5" fill="var(--ink)" />
            <circle cx={75 + look} cy="44" r="4.5" fill="var(--ink)" />
            <circle cx={58.5 + look} cy="48.5" r="1.4" fill="var(--cream)" />
            <circle cx={76.5 + look} cy="42.5" r="1.4" fill="var(--cream)" />
          </>
        )}
        <circle
          cx="52"
          cy="60"
          r="4"
          fill="var(--macro-protein)"
          opacity="0.35"
        />
        <circle
          cx="83"
          cy="51"
          r="4"
          fill="var(--macro-protein)"
          opacity="0.35"
        />
        <path
          d={mood === 'cheer' ? 'M60 60 q9 10 18 -5' : 'M62 60 q7 6 14 -3'}
          stroke="var(--ink)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill={mood === 'cheer' ? 'var(--ink)' : 'none'}
        />
      </g>
      {mood === 'wave' && (
        <path
          className="leaf-mascot__hand"
          d="M98 34 q8 -4 10 -12"
          stroke="var(--lime)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {mood === 'point' && (
        <path
          d="M92 62 l14 -2 m-5 -5 l5 5 l-5 4"
          stroke="var(--lime)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
      {mood === 'cheer' && (
        <g fill="var(--lime)">
          <circle cx="20" cy="26" r="3" />
          <circle cx="100" cy="88" r="3" />
          <circle cx="104" cy="30" r="2" />
        </g>
      )}
    </svg>
  );
}
