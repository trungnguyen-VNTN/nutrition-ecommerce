import { setupWorker } from 'msw/browser';
import { createHandlers } from './handlers';

const worker = setupWorker(
  ...createHandlers(() =>
    new URLSearchParams(window.location.search).get('mock'),
  ),
);

export async function startMocks() {
  if (!import.meta.env.DEV) return;
  await worker.start({
    quiet: true,
    onUnhandledRequest(request, print) {
      if (new URL(request.url).pathname.startsWith('/api/')) print.error();
    },
  });
}
