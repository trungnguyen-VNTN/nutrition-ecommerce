import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A fake Cognito library: the "pool" remembers who signed in through the storage it was given,
// like the real one does with its CognitoIdentityServiceProvider.* keys.
const cognito = vi.hoisted(() => ({
  valid: true,
  sessionCalls: 0,
}));

vi.mock('amazon-cognito-identity-js', () => {
  type Store = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  };
  const LAST = 'CognitoIdentityServiceProvider.client.LastAuthUser';
  const payload = (data: Record<string, unknown>) => ({
    decodePayload: () => data,
    getJwtToken: () => 'jwt',
  });
  const session = () => ({
    isValid: () => cognito.valid,
    getAccessToken: () =>
      payload({ sub: 'user-sub', 'cognito:groups': ['ADMIN'] }),
    getIdToken: () => payload({ email: 'buyer@example.invalid' }),
  });
  class CognitoUser {
    constructor(private data: { Username: string; Storage: Store }) {}
    authenticateUser(
      _details: unknown,
      callbacks: { onSuccess: (s: unknown) => void },
    ) {
      this.data.Storage.setItem(LAST, this.data.Username);
      this.data.Storage.setItem(
        'CognitoIdentityServiceProvider.client.user.idToken',
        'token',
      );
      callbacks.onSuccess(session());
    }
    getSession(callback: (error: Error | null, s: unknown) => void) {
      cognito.sessionCalls++;
      callback(null, session());
    }
    signOut() {
      this.data.Storage.removeItem(LAST);
      this.data.Storage.removeItem(
        'CognitoIdentityServiceProvider.client.user.idToken',
      );
    }
  }
  class CognitoUserPool {
    constructor(private data: { Storage: Store }) {}
    getCurrentUser() {
      const name = this.data.Storage.getItem(LAST);
      return name
        ? new CognitoUser({ Username: name, Storage: this.data.Storage })
        : null;
    }
  }
  return {
    CognitoUser,
    CognitoUserPool,
    AuthenticationDetails: class {},
    CognitoUserAttribute: class {},
  };
});

// localStorage that survives "reloads" (module re-imports) within one test.
const saved = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => void saved.set(key, value),
    removeItem: (key: string) => void saved.delete(key),
    clear: () => saved.clear(),
    key: (i: number) => [...saved.keys()][i] ?? null,
    get length() {
      return saved.size;
    },
  },
});

async function loadPage() {
  vi.resetModules();
  return import('./session');
}

beforeEach(() => {
  saved.clear();
  cognito.valid = true;
  cognito.sessionCalls = 0;
  vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'ap-southeast-1_test');
  vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'client');
});
afterEach(() => vi.unstubAllEnvs());

describe('session persistence', () => {
  it('keeps the user signed in after a page reload', async () => {
    const first = await loadPage();
    await first.signIn('buyer@example.invalid', 'secret-password');
    let seen: unknown;
    first.subscribeSession(() => undefined);

    // Reload: a fresh copy of the module restores the saved session before the first render.
    const reloaded = await loadPage();
    reloaded.subscribeSession(() => (seen = true));
    expect(seen).toBeUndefined();
    expect(cognito.sessionCalls).toBeGreaterThan(0);
    expect(await reloaded.accessToken()).toBe('jwt');
  });

  it('restores the identity from the tokens, including the admin group', async () => {
    const first = await loadPage();
    await first.signIn('buyer@example.invalid', 'secret-password');
    const reloaded = await loadPage();
    const { renderHook } = await import('@testing-library/react');
    const { result } = renderHook(() => reloaded.useSession());
    expect(result.current).toEqual({
      sub: 'user-sub',
      email: 'buyer@example.invalid',
      admin: true,
    });
  });

  it('signs out cleanly: only Cognito keys are removed and a reload stays signed out', async () => {
    window.localStorage.setItem('nutrition.onboarding.v1:user-sub', 'done');
    const first = await loadPage();
    await first.signIn('buyer@example.invalid', 'secret-password');
    first.signOut();
    expect(
      [...saved.keys()].filter((key) =>
        key.startsWith('CognitoIdentityServiceProvider.'),
      ),
    ).toEqual([]);
    expect(
      window.localStorage.getItem('nutrition.onboarding.v1:user-sub'),
    ).toBe('done');

    const reloaded = await loadPage();
    expect(await reloaded.accessToken()).toBeNull();
  });

  it('drops a saved session that is no longer valid', async () => {
    const first = await loadPage();
    await first.signIn('buyer@example.invalid', 'secret-password');
    cognito.valid = false;
    const reloaded = await loadPage();
    expect(await reloaded.accessToken()).toBeNull();
    expect(
      saved.get('CognitoIdentityServiceProvider.client.LastAuthUser'),
    ).toBeUndefined();
  });
});
