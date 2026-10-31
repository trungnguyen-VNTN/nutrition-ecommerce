import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { useSyncExternalStore } from 'react';

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value);
  },
  removeItem: (key: string) => {
    values.delete(key);
  },
  clear: () => values.clear(),
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
          const claims = session.getAccessToken().decodePayload() as Record<
            string,
            unknown
          >;
          current = candidate;
          identity = {
            sub: String(claims.sub),
            email,
            admin:
              Array.isArray(claims['cognito:groups']) &&
              claims['cognito:groups'].includes('ADMIN'),
          };
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
