import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(path);
      continue;
    }
    assert(
      !/mockServiceWorker|mock[s-]|msw/i.test(entry.name),
      `Mock asset: ${path}`,
    );
    if (/\.(js|html)$/.test(entry.name)) {
      const source = await readFile(path, 'utf8');
      for (const marker of [
        'mockServiceWorker',
        'setupWorker',
        'Mock Service Worker',
        'serviceWorker.register',
      ]) {
        assert(
          !source.includes(marker),
          `Production contains ${marker}: ${path}`,
        );
      }
    }
  }
}

const dist = fileURLToPath(new URL('../dist', import.meta.url));
await inspect(dist);
// Icons linked from index.html must ship; they live in public/ next to the dev-only worker.
const shipped = new Set(await readdir(dist));
for (const file of [
  'favicon.svg',
  'favicon-32.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'manifest.webmanifest',
])
  assert(shipped.has(file), `Missing public asset in the build: ${file}`);
process.stdout.write(
  'Production assets contain no MSW worker or registration code; app icons are present.\n',
);
