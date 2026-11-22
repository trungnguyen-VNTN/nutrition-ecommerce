import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/session';
import { LeafMascot } from './leaf-mascot';
import { tourSteps } from './steps';
import {
  closeReplay,
  hasSeenTour,
  markTourSeen,
  useReplayRequested,
} from './tour-store';

// No tour on the sign-in pages: it starts on the first page after them.
const AUTH_PAGES = ['/login', '/register', '/forgot-password'];

/** Shows the guide once per account after the first sign-in, or whenever the footer asks for it. */
export function OnboardingTour() {
  const identity = useSession();
  const replay = useReplayRequested();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const auto =
    !!identity &&
    dismissed !== identity.sub &&
    !AUTH_PAGES.includes(pathname) &&
    !hasSeenTour(identity.sub);
  if (!replay && !auto) return null;
  return (
    <Tour
      admin={!!identity?.admin}
      onClose={() => {
        markTourSeen(identity?.sub);
        setDismissed(identity?.sub ?? null);
        closeReplay();
      }}
    />
  );
}

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 6;
const GAP = 14;
const EDGE = 16;

/** First control with this `data-tour` value that is actually on screen (dock or header row). */
function findTarget(name: string | undefined): Rect | null {
  if (!name) return null;
  for (const element of document.querySelectorAll(`[data-tour~="${name}"]`)) {
    const box = element.getBoundingClientRect();
    if (box.width > 0 && box.height > 0)
      return {
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
      };
  }
  return null;
}

function Tour({ admin, onClose }: { admin: boolean; onClose: () => void }) {
  const steps = tourSteps(admin);
  const [index, setIndex] = useState(0);
  const step = steps[index]!;
  const last = index === steps.length - 1;
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });
  const card = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const bodyId = useId();

  // Measure the highlighted control; again on resize and scroll so the spotlight stays on it.
  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setRect(findTarget(step.target));
        setViewport({ width: window.innerWidth, height: window.innerHeight });
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [step.target]);

  // Each step moves focus to its title, so screen readers announce it; focus returns on close.
  useEffect(() => {
    heading.current?.focus();
  }, [index]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus?.();
  }, []);

  const go = useCallback(
    (delta: number) =>
      setIndex((current) =>
        Math.min(steps.length - 1, Math.max(0, current + delta)),
      ),
    [steps.length],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'Tab') {
      // Modal dialog: keep focus inside the card.
      const focusable = [
        ...(card.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled])',
        ) ?? []),
      ];
      if (!focusable.length) return;
      const first = focusable[0]!;
      const lastButton = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === heading.current)) {
        event.preventDefault();
        lastButton.focus();
      } else if (!event.shiftKey && active === lastButton) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const width = Math.min(400, viewport.width - EDGE * 2);
  let position: CSSProperties;
  if (!rect) {
    position = {
      left: (viewport.width - width) / 2,
      top: '50%',
      transform: 'translateY(-50%)',
    };
  } else {
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, EDGE),
      viewport.width - width - EDGE,
    );
    position =
      rect.top + rect.height / 2 < viewport.height / 2
        ? { left, top: rect.top + rect.height + PAD + GAP }
        : { left, bottom: viewport.height - rect.top + PAD + GAP };
  }

  return createPortal(
    <div className="tour-layer" data-testid="onboarding-tour">
      {rect ? (
        <div
          aria-hidden="true"
          className="tour-spotlight"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      ) : (
        <div aria-hidden="true" className="tour-scrim" />
      )}
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="tour-card"
        style={{ ...position, width }}
        onKeyDown={onKeyDown}
      >
        <div key={step.id} className="tour-step">
          <div className="flex items-center gap-3">
            <LeafMascot mood={step.mood} className="size-16 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink-muted tabular-nums">
                Hướng dẫn · Bước {index + 1} / {steps.length}
              </p>
              <h2
                ref={heading}
                id={titleId}
                tabIndex={-1}
                className="font-display text-xl font-extrabold text-ink outline-none"
              >
                {step.title}
              </h2>
            </div>
          </div>
          <p id={bodyId} className="mt-3 text-sm leading-6 text-ink">
            {step.body}
          </p>
        </div>
        <div aria-hidden="true" className="mt-4 flex gap-1.5">
          {steps.map((item, i) => (
            <span
              key={item.id}
              className={`h-1.5 rounded-pill ${i === index ? 'w-6 bg-brand' : 'w-1.5 bg-line-strong'}`}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!last && (
            <Button variant="ghost" onClick={onClose}>
              Bỏ qua
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            {index > 0 && (
              <Button variant="outline" onClick={() => go(-1)}>
                Trước
              </Button>
            )}
            <Button onClick={last ? onClose : () => go(1)}>
              {last ? 'Bắt đầu khám phá' : 'Tiếp'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
