import { MapPin, Phone } from 'lucide-react';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/cn';
import { firstNumber } from '@/lib/format';
import {
  pickupCodeOf,
  riderDispatchAtOf,
  riderNameOf,
  riderPhoneOf,
  riderReachedAtOf,
  riderStatusOf,
} from './orderDomain';
import type { Order } from '@/types/order';

function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const REACHED = ['reached_restaurant', 'reached', 'at_restaurant', 'arrived'];
const ASSIGNED = ['assigned', 'accepted'];
const SEARCHING = ['unassigned', 'searching', 'pending'];

/**
 * Rider dispatch / geofence status strip. Mirrors the legacy `riderStatusHtml`:
 * a rider is never called "arriving" without a live status, and a name/ETA is
 * only shown when the backend supplies one. Countdowns (counter wait time and
 * scheduled dispatch) tick locally from the persisted server timestamps.
 */
export function RiderStatus({ order }: { order: Order }) {
  const s = order.status;
  const rs = riderStatusOf(order);
  const reachedAt = riderReachedAtOf(order);
  const dispatchAt = riderDispatchAtOf(order);

  const countdown = (rs !== '' && SEARCHING.includes(rs) && dispatchAt !== null) || reachedAt !== null;
  const now = useNow(1000, countdown);

  if (['placed', 'cancelled', 'delivered'].includes(s)) return null;

  const name = riderNameOf(order);
  const code = pickupCodeOf(order);

  // Geofence: the rider has physically reached the counter.
  if (REACHED.includes(rs)) {
    const waitMs = reachedAt !== null ? Math.max(0, now - reachedAt) : null;
    return (
      <div className="rounded-btn border border-info/30 bg-info-bg px-2 py-1.5 text-xs text-info-ink">
        <p className="inline-flex items-start gap-1">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Rider <strong>{name}</strong> has reached counter · Hand over Pickup Code{' '}
            {code ? `#${code}` : '—'}
            {waitMs !== null ? ` · Waiting ${mmss(waitMs)}` : ''}
          </span>
        </p>
      </div>
    );
  }

  // Rider assigned / accepted: show the ETA and a one-tap call chip.
  if (ASSIGNED.includes(rs)) {
    const eta = firstNumber(
      order.riderEtaMinutes,
      order.etaMinutes,
      order.riderEta,
      order.arrivingInMinutes,
    );
    const phone = riderPhoneOf(order);
    return (
      <div className="flex items-center gap-2 text-xs text-info-ink">
        <span className="inline-flex min-w-0 flex-1 items-center gap-1">
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-info motion-reduce:animate-none" />
          <span className="truncate">
            Rider <strong>{name}</strong> is arriving
            {eta !== null && eta > 0 ? ` in ~${Math.round(eta)} mins` : ' shortly'}
          </span>
        </span>
        {phone ? (
          <a
            href={`tel:${String(phone)}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-btn border border-info/40 px-2 py-0.5 font-semibold"
          >
            <Phone className="h-3 w-3" aria-hidden="true" /> Call
          </a>
        ) : null}
      </div>
    );
  }

  // Scheduled dispatch: countdown synced to the kitchen prep deadline.
  if (SEARCHING.includes(rs) && dispatchAt !== null && dispatchAt > now) {
    return (
      <div className="flex items-center gap-1 text-xs text-info-ink">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info motion-reduce:animate-none" />
        <span>
          Rider dispatch scheduled in <strong>{mmss(dispatchAt - now)}</strong> (synced with your prep
          time)
        </span>
      </div>
    );
  }

  // Legacy order-status fallbacks.
  if (!['waiting_for_rider', 'assigned', 'out_for_delivery', 'preparing', 'confirmed'].includes(s)) {
    return null;
  }
  const eta = firstNumber(order.riderEtaMinutes, order.etaMinutes, order.riderEta);
  const reached = !!(order.riderArrived || order.riderAtRestaurant || order.riderReached);
  const cls = 'flex items-center gap-1 text-xs text-info-ink';

  if (reached) {
    return (
      <div className={cls}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info motion-reduce:animate-none" />
        <span>Rider has reached restaurant</span>
      </div>
    );
  }
  if (s === 'waiting_for_rider') {
    return (
      <div className={cls}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info motion-reduce:animate-none" />
        <span>Waiting for rider assignment</span>
      </div>
    );
  }
  if (s === 'assigned') {
    return (
      <div className={cls}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info motion-reduce:animate-none" />
        <span>
          {eta !== null && eta > 0
            ? `Rider is arriving in ${Math.round(eta)} mins`
            : 'Rider is on the way'}
        </span>
      </div>
    );
  }
  if (s === 'out_for_delivery') {
    return (
      <div className={cn(cls, 'text-ink-soft')}>
        <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
        <span>Picked up · out for delivery</span>
      </div>
    );
  }
  // confirmed / preparing: only claim a rider figure when the backend supplies one.
  return (
    <div className={cls}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info motion-reduce:animate-none" />
      <span>
        {eta !== null && eta > 0
          ? `Rider is arriving in ${Math.round(eta)} mins`
          : 'Waiting for rider assignment'}
      </span>
    </div>
  );
}
