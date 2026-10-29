import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from './uiStore';

/** Minimal matchMedia stub so we can drive the system preference. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mq = {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.delete(cb),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mq),
  );
  return {
    fire(next: boolean) {
      mq.matches = next;
      listeners.forEach((cb) => cb({ matches: next }));
    },
  };
}

describe('uiStore theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to the system preference', () => {
    stubMatchMedia(true);
    useUiStore.getState().setThemePreference('system');
    expect(useUiStore.getState().themePreference).toBe('system');
    expect(useUiStore.getState().theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('persists an explicit choice and applies it', () => {
    stubMatchMedia(false);
    useUiStore.getState().setThemePreference('dark');
    expect(window.localStorage.getItem('eatswada_vendor_theme')).toBe('dark');
    expect(useUiStore.getState().theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    useUiStore.getState().setThemePreference('light');
    expect(window.localStorage.getItem('eatswada_vendor_theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('toggle from system commits to the opposite of what is shown', () => {
    stubMatchMedia(true); // system => dark
    useUiStore.getState().setThemePreference('system');
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().themePreference).toBe('light');
    expect(useUiStore.getState().theme).toBe('light');
  });
});
