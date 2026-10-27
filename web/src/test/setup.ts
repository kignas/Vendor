import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

/*
 * Some tests run in the `node` environment (see the `@vitest-environment node`
 * docblock in the pure-lib test files) because jsdom ships its own
 * `AbortController`, and Node's undici `fetch` rejects a signal from another
 * realm. Node's real `AbortController` is used there, so the timeout path is
 * exercised for real. The app only touches a tiny slice of `window` in those
 * tests, so we install the minimum here.
 */
if (typeof window === 'undefined') {
  const store = new Map<string, string>();
  const localStorageShim = {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: localStorageShim,
    location: { hash: '' },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
}

// MSW is the single network boundary in tests: no real request can escape.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
});
afterAll(() => server.close());

