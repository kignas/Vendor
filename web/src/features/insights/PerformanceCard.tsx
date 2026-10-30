import { useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  Clock,
  Gauge,
  Info,
  Star,
  TrendingUp,
} from 'lucide-react';
import { InfoTip } from '@/components/InfoTip';
import { StatusPill } from '@/components/StatusPill';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeletons';
import { cn } from '@/lib/cn';
import type { UseQueryResult } from '@tanstack/react-query';
import type { PerformanceData, PerformanceFactor } from '@/types/performance';

/**
 * Plain-language improvement tips, keyed by the backend's factor key. The
 * wording explains HOW to move each factor; no threshold or target is invented
 * (the backend does not expose one to vendors).
 */
const FACTOR_TIPS: Record<string, string> = {
  ratings: 'Ask happy customers to rate you after delivery; reply to low reviews promptly.',
  completion: 'Accept orders you can fulfil in time and avoid last-minute cancellations.',
  preparation: 'Keep prep times close to your promise, especially at peak hours.',
  cancellation: 'Cancellations from your side count against you more than customer cancellations.',
  complaints: 'Fewer complaints and refunds lift this factor; resolve issues fast.',
  repeat: 'Consistent quality and packaging bring customers back.',
  recent: 'This factor reflects the last few days — a strong recent run lifts your score.',
};

const AVAILABILITY_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  orderable: 'success',
  busy: 'warning',
  temporarily_closed: 'warning',
  closed_today: 'warning',
  outside_hours: 'warning',
  suspended: 'danger',
  unapproved: 'danger',
  inactive: 'danger',
  unknown: 'neutral',
};

/** Administrative (long-lived) reasons vs temporary (daily) ones. */
const ADMIN_CLASSES = new Set(['suspended', 'unapproved', 'inactive']);

function FactorRow({ factor }: { factor: PerformanceFactor }) {
  const key = String(factor.key ?? '');
  const pct = Math.round((Number(factor.normalised) || 0) * 100);
  const tip = FACTOR_TIPS[key];
  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-sm text-ink">
          <span className="truncate">{factor.label || key}</span>
          {tip ? <InfoTip label={factor.label || key} text={tip} /> : null}
        </span>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-soft">
          {factor.hasData === false ? 'Limited data' : `${pct}%`}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-pill bg-border-soft">
        <div
          className={cn('h-full origin-left rounded-pill', factor.hasData === false ? 'bg-ink-faint' : 'bg-success')}
          style={{ width: `${factor.hasData === false ? 100 : pct}%` }}
          aria-hidden="true"
        />
      </div>
    </li>
  );
}

/**
 * Restaurant performance & ranking (Phase 2). STRICTLY READ-ONLY: shows the
 * vendor's own score, its factors and the live availability classification, all
 * returned by `GET /vendor/performance`. The vendor cannot edit weights, pins or
 * scores; this card only renders them.
 */
export function PerformanceCard({ query }: { query: UseQueryResult<PerformanceData | null> }) {
  const [open, setOpen] = useState(false);

  if (query.isLoading) {
    return (
      <section className="rounded-card border border-border bg-card p-4" role="status" aria-label="Loading performance">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-8 w-20" />
        <Skeleton className="mt-3 h-3 w-full" />
      </section>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        message="Could not load your performance score."
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }

  const data = query.data;
  if (!data) return null;

  const score = Number(data.score ?? 0);
  const availabilityClass = String(data.availability?.class ?? 'unknown');
  const availabilityTone = AVAILABILITY_TONE[availabilityClass] ?? 'neutral';
  const isAdmin = ADMIN_CLASSES.has(availabilityClass);
  const availabilityLabel = data.availability?.label || availabilityClass.replace(/_/g, ' ');
  const ranking = data.ranking ?? {};
  const factors = Array.isArray(data.factors) ? data.factors : [];

  return (
    <section className="rounded-card border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Gauge className="h-5 w-5 text-brand-ink" aria-hidden="true" />
        <h2 className="text-sm font-bold text-ink">Performance &amp; ranking</h2>
        <InfoTip
          label="Performance & ranking"
          text="Your restaurant's own score, calculated by Eatswada from your recent activity. Views alone do not determine ranking."
        />
      </div>

      <div className="mt-3 flex items-end gap-3">
        <span className="text-3xl font-extrabold tabular-nums text-ink">{score.toFixed(1)}</span>
        <span className="pb-1 text-xs text-ink-soft">out of 100</span>
        {data.isNewRestaurant ? (
          <StatusPill tone="info" className="mb-1 ml-auto">
            New restaurant, limited data
          </StatusPill>
        ) : null}
      </div>

      {/* Badges: only when the backend says so. */}
      {ranking.featured || ranking.pinned || ranking.sponsored ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {ranking.featured ? (
            <StatusPill tone="brand">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Featured
            </StatusPill>
          ) : null}
          {ranking.pinned ? <StatusPill tone="brand">Pinned</StatusPill> : null}
          {ranking.sponsored ? (
            <StatusPill tone="warning">{ranking.sponsorLabel || 'Sponsored'}</StatusPill>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill tone={availabilityTone} dot>
          {availabilityLabel}
        </StatusPill>
        {!data.availability?.orderable ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-soft">
            <AlertTriangle className="h-3.5 w-3.5 text-warning-ink" aria-hidden="true" />
            {isAdmin ? 'Set by Eatswada' : 'Temporary'}
            {data.availability?.reason ? ` · ${data.availability.reason}` : ''}
          </span>
        ) : null}
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-ink-soft">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Ranking blends ratings, completion, preparation, cancellations, complaints, repeat
          customers and recent performance. Views alone do not determine ranking.
        </span>
      </p>

      {factors.length ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-3 flex min-h-tap w-full items-center justify-between rounded-btn border border-border px-3 text-sm font-semibold text-ink transition-colors hover:bg-border-soft"
          >
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-brand-ink" aria-hidden="true" />
              Ranking factors
            </span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
          </button>
          {open ? (
            <ul className="mt-1 divide-y divide-border-soft">
              {factors.map((f, i) => (
                <FactorRow key={String(f.key ?? i)} factor={f} />
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {data.computedAt ? (
        <p className="mt-3 flex items-center gap-1 text-[11px] text-ink-soft">
          <Clock className="h-3 w-3" aria-hidden="true" />
          Calculated {new Date(data.computedAt).toLocaleString('en-IN')}
        </p>
      ) : null}

      {typeof data.sample?.avgRating === 'number' ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-soft">
          <Star className="h-3 w-3 text-star" aria-hidden="true" />
          {data.sample.avgRating.toFixed(1)} average rating
          {typeof data.sample?.reviews === 'number' ? ` · ${data.sample.reviews} reviews` : ''}
        </p>
      ) : null}
    </section>
  );
}
