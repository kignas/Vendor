/**
 * Review domain helpers — a faithful port of the legacy review helpers in
 * index.html (`reviewReplyText`, `reviewScoreOf`, `reviewCustomerCount`,
 * `reviewDateLabel`, `reviewItemRatings`, `reviewMatches`). Pure functions so
 * they can be unit-tested without the DOM.
 */
import { firstNumber } from '@/lib/format';
import type { Review, ReviewItemRating } from '@/types/review';

export function reviewId(review: Review): string {
  return String(review._id ?? review.id ?? '');
}

export function reviewReplyText(review: Review): string {
  const reply = review.vendorReply;
  if (!reply) return '';
  return typeof reply === 'string' ? reply : (reply.message ?? reply.text ?? '');
}

export function reviewReplyAt(review: Review): string {
  const reply = review.vendorReply;
  if (!reply || typeof reply === 'string') {
    return String(review.vendorReplyAt ?? review.repliedAt ?? '');
  }
  return String(reply.createdAt ?? reply.repliedAt ?? reply.at ?? review.vendorReplyAt ?? '');
}

export function reviewCustomerName(review: Review): string {
  return review.user?.name ?? review.customer?.name ?? 'Customer';
}

/** Clamped to 1–5 exactly like the legacy `reviewScoreOf`. */
export function reviewScoreOf(review: Review): number {
  return Math.max(1, Math.min(5, Number(review.score ?? review.rating ?? 0)));
}

export function reviewScoreClass(score: number): 'good' | 'mid' | 'bad' {
  return score >= 4 ? 'good' : score >= 3 ? 'mid' : 'bad';
}

export function reviewCustomerCount(review: Review): number | null {
  return firstNumber(
    review.user?.orderCount,
    review.customer?.orderCount,
    review.customerOrderCount,
    review.orderCount,
  );
}

export function reviewItemRatings(review: Review): ReviewItemRating[] {
  const raw = review.itemRatings ?? review.items ?? review.dishRatings;
  return Array.isArray(raw) ? raw.filter(Boolean) : [];
}

export function reviewPhotos(review: Review): string[] {
  const raw = review.photos ?? review.images ?? review.attachments;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      if (typeof p === 'string') return p;
      const obj = p as { url?: string; secure_url?: string; secureUrl?: string } | null;
      return obj?.url ?? obj?.secure_url ?? obj?.secureUrl ?? '';
    })
    .filter(Boolean);
}

/** Search + filter predicate. Mirrors legacy `reviewMatches`. */
export function reviewMatches(review: Review, query: string, filter: string): boolean {
  if (filter && filter !== 'all') {
    if (filter === 'replied' && !reviewReplyText(review)) return false;
    if (filter === 'unreplied' && reviewReplyText(review)) return false;
    if (/^[1-5]$/.test(filter) && reviewScoreOf(review) !== Number(filter)) return false;
  }
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    review.user?.name,
    review.customer?.name,
    review.comment,
    review.orderNumber,
    review.publicOrderId,
    reviewReplyText(review),
    reviewItemRatings(review)
      .map((i) => i.name ?? i.itemName)
      .join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

export type DateFilter = 'all' | '7d' | '30d';

/** True when a review falls inside the date filter window. */
export function reviewInDateRange(review: Review, filter: DateFilter, now = Date.now()): boolean {
  if (filter === 'all') return true;
  const raw = review.createdAt;
  if (!raw) return false;
  const ms = new Date(raw).getTime();
  if (!Number.isFinite(ms)) return false;
  const days = filter === '7d' ? 7 : 30;
  return now - ms <= days * 24 * 60 * 60 * 1000;
}

export interface RatingBucket {
  stars: number;
  count: number;
  /** Share of the reviewed rows, 0–100. */
  pct: number;
}

/**
 * Rating distribution across the supplied reviews, from 5 stars down to 1.
 * It reflects the rows actually loaded (the backend returns one page at a
 * time); callers label it with the row count so a partial page is never passed
 * off as the whole population.
 */
export function ratingDistribution(reviews: Review[]): RatingBucket[] {
  const buckets = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, pct: 0 }));
  for (const r of reviews) {
    const score = reviewScoreOf(r);
    const bucket = buckets.find((b) => b.stars === score);
    if (bucket) bucket.count += 1;
  }
  const total = reviews.length;
  for (const b of buckets) b.pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
  return buckets;
}
