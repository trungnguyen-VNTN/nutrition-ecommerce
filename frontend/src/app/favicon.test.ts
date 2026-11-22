import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

describe('favicon and app icons', () => {
  it('links every icon from index.html to a file that ships in public/', () => {
    const hrefs = [
      ...html.matchAll(
        /<link rel="(?:icon|apple-touch-icon|manifest)" href="([^"]+)"/g,
      ),
    ].map((match) => match[1]!);
    expect(hrefs).toEqual([
      '/favicon-32.png',
      '/favicon.svg',
      '/apple-touch-icon.png',
      '/manifest.webmanifest',
    ]);
    for (const href of hrefs)
      expect(existsSync(resolve(root, 'public', href.slice(1)))).toBe(true);
  });

  it('uses the brand colours in the icon and the manifest', () => {
    const svg = readFileSync(resolve(root, 'public/favicon.svg'), 'utf8');
    const manifest = JSON.parse(
      readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8'),
    ) as {
      theme_color: string;
      icons: { src: string }[];
    };
    expect(svg).toContain('#0f1f18');
    expect(svg).toContain('#d6ee8f');
    expect(manifest.theme_color).toBe('#0f1f18');
    for (const icon of manifest.icons)
      expect(existsSync(resolve(root, 'public', icon.src.slice(1)))).toBe(true);
  });
});
