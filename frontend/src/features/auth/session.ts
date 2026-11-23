import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { useSyncExternalStore } from 'react';

// Cognito tokens live in localStorage (the library's default) so a page reload or a new tab keeps
// the user signed in; the refresh token renews the session. Only Cognito's own keys are touched.
// When storage is unavailable (private mode, blocked site data) they fall back to memory, which
// lasts until the page is reloaded.
const COGNITO_PREFIX = 'CognitoIdentityServiceProvider.';
const memory = new Map<string, string>();
function browserStorage(): Storage | null {
  try {
    const probe = COGNITO_PREFIX + 'probe';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}
const persistent = typeof window === 'undefined' ? null : browserStorage();
const storage = {
  getItem: (key: string) =>
    persistent ? persistent.getItem(key) : (memory.get(key) ?? null),
  setItem: (key: string, value: string) => {
    if (persistent) persistent.setItem(key, value);
    else memory.set(key, value);
  },
  removeItem: (key: string) => {
    if (persistent) persistent.removeItem(key);
    else memory.delete(key);
  },
  clear: () => {
    memory.clear();
    if (!persistent) return;
    for (const key of Object.keys(persistent))
      if (key.startsWith(COGNITO_PREFIX)) persistent.removeItem(key);
  },
};
const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
export const authConfigured = Boolean(poolId && clientId);
const pool = authConfigured
  ? new CognitoUserPool({
      UserPoolId: poolId!,
      ClientId: clientId!,
      Storage: storage,
    })
  : null;
type Identity = { sub: string; email: string; admin: boolean };
let identity: Identity | null = null;
let current: CognitoUser | null = null;
let epoch = 0;
let refresh: Promise<string | null> | null = null;
const listeners = new Set<() => void>();
export const subscribeSession = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useSession = () =>
  useSyncExternalStore(subscribeSession, () => identity);
const emit = () => listeners.forEach((listener) => listener());
function identityOf(session: CognitoUserSession): Identity {
  const access = session.getAccessToken().decodePayload() as Record<
    string,
    unknown
  >;
  const id = session.getIdToken().decodePayload() as Record<string, unknown>;
  const groups = access['cognito:groups'];
  return {
    sub: String(access.sub),
    email: String(id.email ?? ''),
    admin: Array.isArray(groups) && groups.includes('ADMIN'),
  };
}

/** Restores the session saved by an earlier sign-in (page reload, new tab). */
export function restoreSession() {
  const saved = pool?.getCurrentUser();
  if (!saved) return;
  const expected = epoch;
  current = saved;
  // Synchronous while the access token is valid, so the first render is already signed in;
  // otherwise the library refreshes it with the refresh token first.
  saved.getSession(
    (error: Error | null, session: CognitoUserSession | null) => {
      if (expected !== epoch) return;
      if (error || !session?.isValid()) {
        signOut();
        return;
      }
      identity = identityOf(session);
      emit();
    },
  );
}

function user(email: string) {
  if (!pool) throw new Error('AUTH_NOT_CONFIGURED');
  return new CognitoUser({ Username: email, Pool: pool, Storage: storage });
}
export function signOut() {
  epoch++;
  current?.signOut();
  current = null;
  identity = null;
  storage.clear();
  refresh = null;
  emit();
}
export async function accessToken(): Promise<string | null> {
  if (!current) return null;
  if (refresh) return refresh;
  const expected = epoch;
  const pending = new Promise<string | null>((resolve) => {
    current!.getSession(
      (error: Error | null, session: CognitoUserSession | null) => {
        if (expected !== epoch) {
          resolve(null);
          return;
        }
        if (error || !session?.isValid()) {
          signOut();
          resolve(null);
          return;
        }
        resolve(session.getAccessToken().getJwtToken());
      },
    );
  });
  refresh = pending;
  try {
    return await pending;
  } finally {
    if (refresh === pending) refresh = null;
  }
}
export function signIn(email: string, password: string) {
  const candidate = user(email);
  const expected = ++epoch;
  return new Promise<void>((resolve, reject) =>
    candidate.authenticateUser(
      new AuthenticationDetails({ Username: email, Password: password }),
      {
        onSuccess: (session) => {
          if (expected !== epoch) {
            candidate.signOut();
            reject(new Error('SESSION_CANCELLED'));
            return;
          }
          current = candidate;
          identity = { ...identityOf(session), email };
          emit();
          resolve();
        },
        onFailure: (error: Error) => reject(error),
        newPasswordRequired: () =>
          reject(new Error('PASSWORD_CHANGE_REQUIRED')),
        mfaRequired: () => reject(new Error('MFA_REQUIRED')),
      },
    ),
  );
}
export function signUp(email: string, password: string) {
  if (!pool) return Promise.reject(new Error('AUTH_NOT_CONFIGURED'));
  return new Promise<void>((resolve, reject) =>
    pool.signUp(
      email,
      password,
      [new CognitoUserAttribute({ Name: 'email', Value: email })],
      [],
      (error) => (error ? reject(error) : resolve()),
    ),
  );
}
export function confirmEmail(email: string, code: string) {
  return new Promise<void>((resolve, reject) =>
    user(email).confirmRegistration(code, false, (error: Error | null) =>
      error ? reject(error) : resolve(),
    ),
  );
}
// Forgot password (Cognito). The pool client has prevent_user_existence_errors, so an unknown
// email behaves like a known one and the UI never reveals whether an account exists.
export function requestPasswordReset(email: string) {
  return new Promise<void>((resolve, reject) =>
    user(email).forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (error: Error) => reject(error),
      inputVerificationCode: () => resolve(),
    }),
  );
}
export function confirmPasswordReset(
  email: string,
  code: string,
  password: string,
) {
  return new Promise<void>((resolve, reject) =>
    user(email).confirmPassword(code, password, {
      onSuccess: () => resolve(),
      onFailure: (error: Error) => reject(error),
    }),
  );
}

restoreSession();
