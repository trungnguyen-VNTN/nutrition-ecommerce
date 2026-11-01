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

await inspect(fileURLToPath(new URL('../dist', import.meta.url)));
process.stdout.write(
  'Production assets contain no MSW worker or registration code.\n',
);
