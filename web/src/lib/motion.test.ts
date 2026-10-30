// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DURATION, DURATION_MS, EASE_OUT, EASE_SPRING } from './motion';

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

/**
 * The motion tokens exist in three places: `lib/motion.ts` (JS), `index.css`
 * (CSS custom properties) and `tailwind.config.js` (utility classes). They must
 * never drift, so this test pins them together.
 */
describe('motion tokens', () => {
  const css = read('../index.css');
  const tw = read('../../tailwind.config.js');

  const bezier = (b: readonly number[]) => `cubic-bezier(${b.join(', ')})`;

  it('exposes the easings as CSS custom properties', () => {
    expect(css).toContain(`--es-ease-out: ${bezier(EASE_OUT)};`);
    expect(css).toContain(`--es-ease-spring: ${bezier(EASE_SPRING)};`);
  });

  it('exposes the durations as CSS custom properties', () => {
    for (const key of ['fast', 'base', 'slow', 'sheet', 'tick'] as const) {
      expect(css).toContain(`--es-dur-${key}: ${DURATION_MS[key]}ms;`);
    }
  });

  it('mirrors the durations and easings in the Tailwind theme', () => {
    for (const key of ['fast', 'base', 'slow', 'sheet'] as const) {
      expect(tw).toContain(`${key}: 'var(--es-dur-${key})'`);
    }
    expect(tw).toContain("out: 'var(--es-ease-out)'");
    expect(tw).toContain("spring: 'var(--es-ease-spring)'");
  });

  it('keeps the CSS animation shorthands on tokens, never hard-coded values', () => {
    // Every `animation` entry must reference the tokens (duration/easing).
    const start = tw.indexOf('animation: {') + 'animation: {'.length;
    const animationBlock = tw.slice(start, tw.indexOf('plugins: []'));
    const entries = animationBlock.match(/^\s*'?[\w-]+'?:\s*'.+',?$/gm) ?? [];
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry).toMatch(/var\(--es-(dur|ease)-/);
    }
  });

  it('keeps millisecond and second duration tables in step', () => {
    for (const key of ['fast', 'base', 'slow', 'sheet', 'tick'] as const) {
      expect(DURATION[key] * 1000).toBe(DURATION_MS[key]);
    }
    // UI changes 150–300ms, sheets up to 350ms (AGENTS.md motion rules).
    expect(DURATION_MS.fast).toBeGreaterThanOrEqual(150);
    expect(DURATION_MS.sheet).toBeLessThanOrEqual(350);
  });
});
