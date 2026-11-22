import { useSyncExternalStore } from 'react';

// Per-device "seen" flag, keyed by the Cognito subject so each account gets the tour once.
// Only an opaque id is stored, never personal data. Storage can be unavailable (private mode):
// the tour then simply shows again next time.
const PREFIX = 'nutrition.onboarding.v1:';

export function hasSeenTour(sub: string): boolean {
  try {
    return window.localStorage.getItem(PREFIX + sub) === 'done';
  } catch {
    return false;
  }
}

export function markTourSeen(sub: string | undefined) {
  if (!sub) return;
  try {
    window.localStorage.setItem(PREFIX + sub, 'done');
  } catch {
    // Ignore: the flag is a convenience only.
  }
}

// Manual replay (footer button) works for every visitor, signed in or not.
let replay = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function openTour() {
  replay = true;
  emit();
}

export function closeReplay() {
  replay = false;
  emit();
}

export function useReplayRequested() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => replay,
  );
}
