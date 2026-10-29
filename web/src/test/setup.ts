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

/*
 * jsdom ships its own AbortController/AbortSignal. MSW builds an undici
 * `Request` from the init, and undici rejects a signal that is not an instance
 * of its own AbortSignal ("Expected signal to be an instance of AbortSignal"),
 * so a DOM component test would fail before the request leaves. This bridge
 * wraps whatever fetch is installed (MSW's proxy) and drops the jsdom signal,
 * re-adding a real AbortError if it aborts. It must wrap MSW, so it installs
 * after server.listen(). Real fetch + MSW are preserved; app code is untouched.
 */
function installFetchBridge(): void {
  const inner = globalThis.fetch.bind(globalThis);
  globalThis.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
    const { signal, ...rest } = init;
    if (!signal) return inner(input, rest);
    return new Promise<Response>((resolve, reject) => {
      const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
      inner(input, rest).then(resolve, reject).finally(() => {
        signal.removeEventListener('abort', onAbort);
      });
    });
  }) as typeof fetch;
}

// MSW is the single network boundary in tests: no real request can escape.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  if (typeof window !== 'undefined') installFetchBridge();
});
afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
});
afterAll(() => server.close());

