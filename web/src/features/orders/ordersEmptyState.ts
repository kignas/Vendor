import type { AvailabilityStatus } from '@/services/api/restaurant';
import type { StorefrontVariant } from '@/components/StorefrontIllustration';
import type { OrderTab } from '@/types/order';

/** Which availability action (if any) the empty state offers. */
export type EmptyAction = 'online' | 'resume' | null;

export interface OrdersEmptyCopy {
  variant: StorefrontVariant;
  title: string;
  body: string;
  action: EmptyAction;
}

/** Neutral copy used while the availability status is loading or unknown. */
const NEUTRAL: OrdersEmptyCopy = {
  variant: 'neutral',
  title: 'No orders right now',
  body: 'New orders will appear here the moment they are placed.',
  action: null,
};

/**
 * Copy for an empty order list while the outlet is accepting orders, chosen per
 * chip so each list describes itself (Step 8 point 3). The default Preparing
 * chip doubles as the "waiting for new orders" landing screen.
 */
const ACCEPTING_BY_TAB: Record<OrderTab, Pick<OrdersEmptyCopy, 'title' | 'body'>> = {
  new: { title: 'You are online', body: 'Waiting for new orders' },
  preparing: { title: 'You are online', body: 'Waiting for new orders' },
  ready: {
    title: 'Nothing ready yet',
    body: 'Orders you mark ready appear here until a rider is assigned.',
  },
  dispatch: {
    title: 'No orders picked up yet',
    body: 'Orders move here once handed to a delivery partner.',
  },
  scheduled: {
    title: 'No scheduled orders',
    body: 'Orders placed for a later slot will appear here.',
  },
  history: { title: 'No past orders', body: 'Delivered and cancelled orders appear here.' },
};

/**
 * Copy for the Orders empty state, driven by the server's availability status.
 *
 * Truthfulness rules (AGENTS.md rule 2 / Step 8 point 3): the screen never
 * claims a state the backend did not report. `busy` is treated as STILL
 * ACCEPTING orders (the backend and the legacy `isOpen` both count `busy` as
 * open), so it must not say "Orders are paused" — it gets the neutral "You are
 * busy" copy with no action. The pause reason is shown ONLY when the server
 * actually sent one; otherwise neutral wording is used. A `null` status (query
 * still loading or failed) falls back to the neutral copy with no status claim
 * and no action.
 */
export function ordersEmptyCopy(
  status: AvailabilityStatus | null,
  reason: string | null,
  tab: OrderTab = 'preparing',
): OrdersEmptyCopy {
  switch (status) {
    case 'open':
      return { variant: 'open', action: null, ...ACCEPTING_BY_TAB[tab] };
    case 'busy':
      return {
        variant: 'busy',
        title: 'You are busy',
        body: 'You are still taking orders — expect longer prep times.',
        action: null,
      };
    case 'temporarily_closed':
      return {
        variant: 'paused',
        title: 'Orders are paused',
        body: reason ?? 'New orders are on hold until you resume.',
        action: 'resume',
      };
    case 'closed_today':
      return {
        variant: 'closed',
        title: 'You are offline',
        body: 'Turn on Online to receive orders',
        action: 'online',
      };
    default:
      return NEUTRAL;
  }
}
