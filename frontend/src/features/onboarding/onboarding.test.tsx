import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { OnboardingTour } from './onboarding-tour';
import { tourSteps } from './steps';
import { closeReplay, hasSeenTour, openTour } from './tour-store';

const session = vi.hoisted(() => ({
  identity: null as null | { sub: string; email: string; admin: boolean },
}));
vi.mock('@/features/auth/session', () => ({
  useSession: () => session.identity,
  accessToken: async () => null,
  signOut: vi.fn(),
}));

const user = (sub: string, admin = false) => ({
  sub,
  email: `${sub}@example.invalid`,
  admin,
});

// In-memory Storage: the test environment has no usable localStorage.
const store = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  },
});

beforeEach(() => {
  window.localStorage.clear();
  session.identity = null;
});
afterEach(() => act(() => closeReplay()));

describe('onboarding guide', () => {
  it('stays hidden for visitors who are not signed in', () => {
    renderApp(<OnboardingTour />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('greets a new account once, walks every step and remembers it per account', async () => {
    session.identity = user('new-user');
    const view = renderApp(<OnboardingTour />);
    const dialog = screen.getByRole('dialog', {
      name: 'Chào bạn, mình là Lá!',
    });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription(/dẫn bạn đi một vòng/);
    // The title takes focus so screen readers announce each step.
    expect(
      screen.getByRole('heading', { name: 'Chào bạn, mình là Lá!' }),
    ).toHaveFocus();

    const steps = tourSteps(false);
    const userAction = userEvent.setup();
    for (let i = 1; i < steps.length; i++) {
      await userAction.click(screen.getByRole('button', { name: 'Tiếp' }));
      expect(
        screen.getByRole('heading', { name: steps[i]!.title }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(`Hướng dẫn · Bước ${i + 1} / ${steps.length}`),
      ).toBeInTheDocument();
    }
    // Ordinary accounts never see the admin step.
    expect(steps.some((step) => step.id === 'admin')).toBe(false);
    await userAction.click(
      screen.getByRole('button', { name: 'Bắt đầu khám phá' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(hasSeenTour('new-user')).toBe(true);

    view.unmount();
    renderApp(<OnboardingTour />);
    expect(screen.queryByRole('dialog')).toBeNull();
    // Another account on the same device still gets its own welcome.
    expect(hasSeenTour('someone-else')).toBe(false);
  });

  it('supports the keyboard: arrows move between steps and Escape skips', async () => {
    session.identity = user('keyboard-user');
    renderApp(<OnboardingTour />);
    const keys = userEvent.setup();
    await keys.keyboard('{ArrowRight}');
    expect(
      screen.getByRole('heading', { name: 'Sản phẩm và bộ lọc' }),
    ).toHaveFocus();
    await keys.keyboard('{ArrowLeft}');
    expect(
      screen.getByRole('heading', { name: 'Chào bạn, mình là Lá!' }),
    ).toBeInTheDocument();
    // Tab stays inside the dialog.
    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 4; i++) {
      await keys.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await keys.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(hasSeenTour('keyboard-user')).toBe(true);
  });

  it('adds the admin step for administrators and points at the admin link', async () => {
    session.identity = user('admin-user', true);
    renderApp(<OnboardingTour />);
    const ids = tourSteps(true).map((step) => step.id);
    expect(ids).toContain('admin');
    expect(
      screen.getByText(`Hướng dẫn · Bước 1 / ${ids.length}`),
    ).toBeInTheDocument();
    expect(tourSteps(true).find((step) => step.id === 'admin')?.target).toBe(
      'admin',
    );
  });

  it('does not open on the sign-in pages', () => {
    session.identity = user('signing-in');
    renderApp(<OnboardingTour />, '/login');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('replays from the footer button even after it was finished', async () => {
    session.identity = user('returning');
    window.localStorage.setItem('nutrition.onboarding.v1:returning', 'done');
    renderApp(<OnboardingTour />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => openTour());
    const dialog = screen.getByRole('dialog');
    await userEvent
      .setup()
      .click(within(dialog).getByRole('button', { name: 'Bỏ qua' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
