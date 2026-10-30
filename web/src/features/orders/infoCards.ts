/**
 * Info-carousel card building + dismissal storage (Phase 3, Step 6).
 *
 * Pure module: no React, no fetch. Every card is derived from data the backend
 * already sends — server alerts (`GET /alerts`), the settlement summary
 * (`GET /settlements/summary`) and the profile (`GET /profile`). Nothing is
 * invented: a card only appears when its source actually returned something, and
 * every number on a card is a count/length or a server figure (never a guess).
 *
 * The carousel itself lives in `InfoCarousel.tsx`; keeping the rules here means
 * the "which cards, and are they dismissed" logic is unit-testable.
 */
import { firstNumber, formatMoney } from '@/lib/format';
import type { VendorAlert } from '@/types/home';
import type { SettlementSummary } from '@/services/api/earnings';
import type { VendorProfile } from '@/services/api/restaurant';

/** NEW key (AGENTS.md rule 6 keeps the three auth keys untouched). */
export const DISMISSED_CARDS_KEY = 'eatswada_vendor_dismissed_cards';

export type InfoCardTone = 'warning' | 'info' | 'brand';

export interface InfoCard {
  /** Deterministic id, also the dismissal key. */
  id: string;
  tone: InfoCardTone;
  title: string;
  body: string;
  actionLabel: string;
  /** In-app route the white button opens. */
  to: string;
}

export interface InfoCardInput {
  alerts?: VendorAlert[] | undefined;
  settlement?: SettlementSummary | null | undefined;
  profile?: VendorProfile | null | undefined;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function countType(alerts: VendorAlert[], type: string): number {
  return alerts.filter((a) => String(a?.type ?? '') === type).length;
}

/**
 * Build the carousel cards from real server data. Order is fixed so the card
 * list (and therefore the dots) is stable across renders.
 */
export function buildInfoCards(input: InfoCardInput): InfoCard[] {
  const cards: InfoCard[] = [];

  // --- Server alerts (GET /alerts) -----------------------------------------
  const alerts = Array.isArray(input.alerts) ? input.alerts : [];
  const outOfStock = countType(alerts, 'out_of_stock');
  const lowStock = countType(alerts, 'low_stock');
  const menuPending = countType(alerts, 'menu_pending');
  const menuRejected = countType(alerts, 'menu_rejected');

  if (outOfStock > 0) {
    cards.push({
      id: 'alert:out_of_stock',
      tone: 'warning',
      title: `${outOfStock} ${plural(outOfStock, 'item', 'items')} out of stock`,
      body: 'Customers cannot order these items right now.',
      actionLabel: 'View stock',
      to: '/inventory?seg=stock',
    });
  }
  if (lowStock > 0) {
    cards.push({
      id: 'alert:low_stock',
      tone: 'warning',
      title: `${lowStock} ${plural(lowStock, 'item', 'items')} running low`,
      body: 'Restock soon to keep them orderable.',
      actionLabel: 'View stock',
      to: '/inventory?seg=stock',
    });
  }
  if (menuPending > 0) {
    cards.push({
      id: 'alert:menu_pending',
      tone: 'info',
      title: `${menuPending} ${plural(menuPending, 'item', 'items')} awaiting review`,
      body: 'Eatswada is reviewing these items.',
      actionLabel: 'View menu',
      to: '/inventory',
    });
  }
  if (menuRejected > 0) {
    cards.push({
      id: 'alert:menu_rejected',
      tone: 'warning',
      title: `${menuRejected} ${plural(menuRejected, 'item', 'items')} need changes`,
      body: 'Eatswada sent these back for changes.',
      actionLabel: 'View menu',
      to: '/inventory',
    });
  }

  // --- Settlement (GET /settlements/summary) -------------------------------
  const available = firstNumber(input.settlement?.availableForWithdrawal);
  if (available !== null && available > 0) {
    cards.push({
      id: 'settlement:available',
      tone: 'brand',
      title: `${formatMoney(available)} available to withdraw`,
      body: 'Move your balance to your bank account.',
      actionLabel: 'Withdraw',
      to: '/business?seg=finance',
    });
  }
  const request = input.settlement?.activePayoutRequest;
  if (request) {
    const amount = firstNumber(request.amount);
    cards.push({
      id: 'settlement:pending',
      tone: 'info',
      title: amount !== null ? `${formatMoney(amount)} withdrawal in progress` : 'Withdrawal in progress',
      body: 'Your payout request is being processed.',
      actionLabel: 'View finance',
      to: '/business?seg=finance',
    });
  }

  // --- Profile (GET /profile) ----------------------------------------------
  // Only when the server explicitly reports a non-verified FSSAI state; an
  // absent field is never turned into a "pending" card.
  const fssai = String(input.profile?.fssaiVerificationStatus ?? '').trim();
  if (fssai && !/^(verified|approved|active|valid)$/i.test(fssai)) {
    cards.push({
      id: 'profile:fssai',
      tone: 'warning',
      title: `FSSAI verification ${fssai.toLowerCase()}`,
      body: 'Update your licence details in your profile.',
      actionLabel: 'Update profile',
      to: '/profile',
    });
  }

  return cards;
}

/** A map of card id → ISO timestamp of when it was dismissed. */
export type DismissedMap = Record<string, string>;

/** Read the dismissal map; any parse/storage failure degrades to "nothing dismissed". */
export function readDismissedCards(): DismissedMap {
  try {
    const raw = window.localStorage.getItem(DISMISSED_CARDS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: DismissedMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function writeDismissedCards(map: DismissedMap): void {
  try {
    window.localStorage.setItem(DISMISSED_CARDS_KEY, JSON.stringify(map));
  } catch {
    /* Storage unavailable (private mode / quota); the app stays usable. */
  }
}

/** Mark a card dismissed now and return the updated map. */
export function dismissCard(id: string, now: number = Date.now()): DismissedMap {
  const map = readDismissedCards();
  map[id] = new Date(now).toISOString();
  writeDismissedCards(map);
  return map;
}

/** Local calendar-day key (`YYYY-M-D`), so "today" respects the device timezone. */
function localDayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * A card is hidden only while it was dismissed on the *current* local day. The
 * next day it reappears — but only if it is still being built, i.e. its
 * underlying alert/settlement still exists.
 */
export function isCardDismissed(id: string, map: DismissedMap, now: number = Date.now()): boolean {
  const at = map[id];
  if (!at) return false;
  const t = new Date(at).getTime();
  if (!Number.isFinite(t)) return false;
  return localDayKey(t) === localDayKey(now);
}

/** The cards to render: built cards minus the ones dismissed today. */
export function visibleInfoCards(
  cards: InfoCard[],
  map: DismissedMap,
  now: number = Date.now(),
): InfoCard[] {
  return cards.filter((card) => !isCardDismissed(card.id, map, now));
}
