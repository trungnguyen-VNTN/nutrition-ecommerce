import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

// Guards the WCAG pairs documented in docs/ui-guidelines.md §2.
const css = readFileSync(join(__dirname, 'tokens.css'), 'utf8');
const token = (name: string) => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!match?.[1]) throw new Error(`Missing hex token --${name}`);
  return match[1];
};
const channel = (hex: string, offset: number) => {
  const v = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) =>
  0.2126 * channel(hex, 1) +
  0.7152 * channel(hex, 3) +
  0.0722 * channel(hex, 5);
const ratio = (a: string, b: string) => {
  const x = luminance(token(a));
  const y = luminance(token(b));
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

it.each([
  ['ink', 'cream'],
  ['ink-muted', 'cream'],
  ['ink-muted', 'surface'],
  ['brand', 'cream'],
  ['cream', 'brand'],
  ['ink', 'lime'],
  ['success', 'cream'],
  ['success', 'success-tint'],
  ['warning', 'warning-tint'],
  ['danger', 'danger-tint'],
])('text %s on %s meets 4.5:1', (fg, bg) => {
  expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
});

it.each([
  ['line-strong', 'cream'],
  ['macro-protein', 'surface'],
  ['macro-carb', 'surface'],
  ['macro-fat', 'surface'],
  ['macro-fiber', 'surface'],
])('graphic %s on %s meets 3:1', (fg, bg) => {
  expect(ratio(fg, bg)).toBeGreaterThanOrEqual(3);
});
