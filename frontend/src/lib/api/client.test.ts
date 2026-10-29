import { describe, expect, it, vi, afterEach } from 'vitest';
import { messages } from '@/app/messages.vi';
import { ApiError, apiErrorMessage, getJson } from './client';

afterEach(() => vi.unstubAllEnvs());

describe('API boundaries', () => {
  it.each([
    [401, messages.apiErrors.unauthorized],
    [403, messages.apiErrors.forbidden],
    [404, messages.apiErrors.notFound],
    [409, messages.apiErrors.conflict],
    [429, messages.apiErrors.rateLimited],
    [503, messages.apiErrors.unavailable],
  ])('maps status %s to safe Vietnamese copy', (status, text) => {
    expect(apiErrorMessage(new ApiError(Number(status)))).toBe(text);
  });

  it('blocks production requests before calling fetch', async () => {
    vi.stubEnv('DEV', false);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      await expect(getJson('products')).rejects.toThrow(
        'Catalog integration is not enabled',
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
