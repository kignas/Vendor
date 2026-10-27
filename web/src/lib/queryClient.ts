import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

/**
 * Shared TanStack Query client.
 *
 * Defaults follow AGENTS.md:
 *   - retry 1 (a single retry, then surface the error state)
 *   - refetchOnWindowFocus on (the kitchen keeps a live queue)
 *   - no retry for auth/4xx errors (retrying a 401/403/404/409 is pointless)
 *   - staleTime per query (callers set it; the global floor is 30 s)
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            if (error.code === 'unauthorized') return false;
            if (error.status >= 400 && error.status < 500) return false;
          }
          return failureCount < 1;
        },
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Mutations are single-flight at the call site (AGENTS.md rule 7);
        // never auto-retry a write.
        retry: 0,
      },
    },
  });
}

export const queryClient = makeQueryClient();

/** Central query-key registry so cache invalidation stays consistent. */
export const queryKeys = {
  restaurant: ['restaurant'] as const,
  orders: (view: string) => ['orders', view] as const,
  orderHistory: (page: number) => ['orders', 'history', page] as const,
  menu: ['menu'] as const,
  inventory: ['inventory'] as const,
  reviews: ['reviews'] as const,
  support: ['support'] as const,
  settings: ['settings'] as const,
  earnings: (period: string) => ['earnings', period] as const,
  settlements: ['settlements'] as const,
  analytics: (period: string) => ['analytics', period] as const,
  notifications: ['notifications'] as const,
  alerts: ['alerts'] as const,
  activity: ['activity'] as const,
  platformStatus: ['platform', 'public-status'] as const,
} as const;
