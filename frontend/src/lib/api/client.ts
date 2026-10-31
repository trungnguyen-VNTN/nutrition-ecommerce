import { messages } from '@/app/messages.vi';
import { accessToken, signOut } from '@/features/auth/session';

export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP ${status}`);
    this.name = 'ApiError';
  }
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return messages.apiErrors.unavailable;
  switch (error.status) {
    case 401:
      return messages.apiErrors.unauthorized;
    case 403:
      return messages.apiErrors.forbidden;
    case 404:
      return messages.apiErrors.notFound;
    case 409:
      return messages.apiErrors.conflict;
    case 429:
      return messages.apiErrors.rateLimited;
    default:
      return messages.apiErrors.unavailable;
  }
}

export async function getJson(
  path: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return requestJson(path, { signal });
}

export async function requestJson(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const token = await accessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(
    new URL(`/api/${path}`, window.location.origin),
    { ...options, headers },
  );
  if (response.status === 401) signOut();
  if (!response.ok) throw new ApiError(response.status);
  return response.json();
}
