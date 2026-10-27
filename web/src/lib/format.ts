/**
 * Formatting helpers. Currency uses Intl.NumberFormat('en-IN', …) per AGENTS.md.
 * These mirror the legacy `formatMoney`, `timeAgo`, `enumLabel`, `num`,
 * `firstNumber` helpers in index.html so the ported UI reads identically.
 */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inr2 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `₹1,250` — the generic money formatter. */
export function formatMoney(value: number | null | undefined): string {
  return inr.format(Number(value ?? 0));
}

/** `₹1,250.50` — bank-facing figures (balances, payouts, UTR batches). */
export function formatMoney2(value: number | null | undefined): string {
  return inr2.format(Number(value ?? 0));
}

/** Coerce to a finite number, or null. Mirrors the legacy `num()`. */
export function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** First finite number from the candidates, or null. Mirrors `firstNumber()`. */
export function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = num(value);
    if (n !== null) return n;
  }
  return null;
}

/** `out_for_delivery` -> `Out For Delivery`. Mirrors the legacy `enumLabel()`. */
export function enumLabel(value: unknown): string {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/** `12m ago` / `2h 5m ago`. Mirrors the legacy `timeAgo()`. */
export function timeAgo(dateStr: string | number | Date | null | undefined): string {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

/** Percentage of prep time elapsed, clamped 0–100. Mirrors `kptPct()`. */
export function kptPct(deadline: number, started: number | null): number {
  if (started === null || !(deadline > started)) return 100;
  const pct = ((Date.now() - started) / (deadline - started)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
