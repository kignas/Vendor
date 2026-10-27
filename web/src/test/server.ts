import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Shared MSW server for Vitest. `onUnhandledRequest: 'error'` (set in
 * vitest.setup.ts) guarantees no test can accidentally hit the real network.
 */
export const server = setupServer(...handlers);
