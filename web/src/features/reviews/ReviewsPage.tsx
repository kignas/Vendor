import { useMemo, useState } from 'react';
import { MessageSquare, Search, Star } from 'lucide-react';
import { ScrollTabs } from '@/components/ScrollTabs';
import { EmptyState } from '@/components/EmptyState';
import { StorefrontIllustration } from '@/components/StorefrontIllustration';
import { ErrorState } from '@/components/ErrorState';
import { BottomSheet } from '@/components/BottomSheet';
import { SkeletonList } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReplyToReview, useReviews } from '@/hooks/useReviews';
import {
  ratingDistribution,
  reviewCustomerCount,
  reviewCustomerName,
  reviewId,
  reviewInDateRange,
  reviewItemRatings,
  reviewMatches,
  reviewPhotos,
  reviewReplyText,
  reviewScoreOf,
  type DateFilter,
} from '@/features/reviews/reviewDomain';
import { cn } from '@/lib/cn';
import type { Review } from '@/types/review';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unreplied', label: 'Unreplied' },
  { id: 'replied', label: 'Replied' },
  { id: '5', label: '5★' },
  { id: '4', label: '4★' },
  { id: '3', label: '3★' },
  { id: '2', label: '2★' },
  { id: '1', label: '1★' },
];

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: 'all', label: 'Any time' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
];

function Stars({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${score} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn('h-3.5 w-3.5', i < score ? 'fill-star text-star' : 'text-border')}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/** Distribution bars across the loaded rows; labelled with that row count. */
function Distribution({ rows }: { rows: Review[] }) {
  const buckets = useMemo(() => ratingDistribution(rows), [rows]);
  return (
    <div className="mt-3 space-y-1" aria-label="Rating distribution">
      {buckets.map((b) => (
        <div key={b.stars} className="flex items-center gap-2 text-xs">
          <span className="w-6 shrink-0 tabular-nums text-ink-soft">{b.stars}★</span>
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-border-soft">
            <span
              className="block h-full rounded-pill bg-star transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${b.pct}%` }}
            />
          </span>
          <span className="w-8 shrink-0 text-right tabular-nums text-ink-soft">{b.count}</span>
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ review, onOpen }: { review: Review; onOpen: (r: Review) => void }) {
  const score = reviewScoreOf(review);
  const name = reviewCustomerName(review);
  const count = reviewCustomerCount(review);
  const replied = !!reviewReplyText(review);

  return (
    <button
      type="button"
      onClick={() => onOpen(review)}
      className="press w-full rounded-card border border-border bg-card p-4 text-left"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-brand/10 text-sm font-bold text-brand-ink"
          aria-hidden="true"
        >
          {name.trim().charAt(0).toUpperCase() || 'C'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{name}</span>
          <span className="block text-xs text-ink-soft">
            {count !== null ? `${count} orders with you` : 'Customer'}
          </span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <Stars score={score} />
          {replied ? (
            <span className="text-[11px] font-semibold text-success-ink">Replied</span>
          ) : (
            <span className="text-[11px] font-semibold text-warning-ink">Awaiting reply</span>
          )}
        </span>
      </div>
      <p className={cn('mt-3 text-sm', review.comment ? 'text-ink' : 'text-ink-soft')}>
        {review.comment || 'No written comment.'}
      </p>
      {reviewReplyText(review) ? (
        <p className="mt-2 rounded-btn bg-border-soft p-2 text-xs text-ink-soft">
          <span className="font-semibold text-ink">You: </span>
          {reviewReplyText(review)}
        </p>
      ) : null}
    </button>
  );
}

function ReviewSheet({ review, onClose }: { review: Review | null; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const reply = useReplyToReview();
  const open = review !== null;
  const alreadyReplied = review ? !!reviewReplyText(review) : false;
  const dishRatings = review ? reviewItemRatings(review) : [];
  const photos = review ? reviewPhotos(review) : [];

  async function submit() {
    if (!review) return;
    const text = message.trim();
    if (text.length < 1 || text.length > 500) return;
    await reply.mutateAsync({ id: reviewId(review), message: text });
    setMessage('');
    onClose();
  }

  return (
    <BottomSheet open={open} onOpenChange={(o) => !o && onClose()} title="Review">
      {review ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink">{reviewCustomerName(review)}</span>
            <Stars score={reviewScoreOf(review)} />
          </div>
          <p className="text-sm text-ink-soft">{review.comment || 'No written comment.'}</p>

          {review.orderNumber || review.publicOrderId ? (
            <p className="text-[11px] text-ink-soft">
              Order #{review.orderNumber ?? review.publicOrderId}
            </p>
          ) : null}

          {photos.length ? (
            <div className="flex gap-2 overflow-x-auto">
              {photos.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt="Customer photo"
                  loading="lazy"
                  className="h-20 w-20 shrink-0 rounded-btn object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ))}
            </div>
          ) : null}

          {dishRatings.length ? (
            <div className="rounded-card border border-border p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">
                Dish ratings
              </p>
              <ul className="space-y-1.5">
                {dishRatings.map((item, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-ink">
                      {Number(item.quantity) || 1} × {item.name ?? item.itemName ?? 'Item'}
                    </span>
                    <span className="tabular-nums text-ink-soft">
                      {Number(item.score ?? item.rating) > 0
                        ? `${Number(item.score ?? item.rating)} ★`
                        : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {alreadyReplied ? (
            <p className="rounded-btn bg-border-soft p-2 text-xs text-ink-soft">
              <span className="font-semibold text-ink">Your reply: </span>
              {reviewReplyText(review)}
            </p>
          ) : (
            <div className="space-y-2">
              <label htmlFor="review-reply" className="text-xs font-semibold text-ink">
                Reply to {reviewCustomerName(review)}
              </label>
              <textarea
                id="review-reply"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Thank the customer or address their feedback…"
                className="w-full rounded-btn border border-border bg-card p-3 text-sm text-ink focus-visible:border-brand-ink"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink-soft">{message.length}/500</span>
                <Button
                  variant="brand"
                  onClick={() => void submit()}
                  disabled={reply.isPending || message.trim().length === 0}
                >
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  {reply.isPending ? 'Posting…' : 'Post reply'}
                </Button>
              </div>
              {reply.isError ? (
                <p className="text-xs text-danger-ink" role="alert">
                  Could not post reply. Please try again.
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </BottomSheet>
  );
}

/**
 * Reviews. Real data from GET /vendor/reviews (paged) with the server's own
 * summary (average rating + counts). Search, rating/date filters and a rating
 * distribution over the loaded rows. Reply posts to POST /reviews/:id/reply.
 */
export function ReviewsPage() {
  const reviews = useReviews();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [active, setActive] = useState<Review | null>(null);

  const allRows = useMemo(
    () => (reviews.data?.pages ?? []).flatMap((p) => p.rows),
    [reviews.data],
  );

  const rows = useMemo(
    () =>
      allRows.filter(
        (r) => reviewMatches(r, query, filter) && reviewInDateRange(r, dateFilter),
      ),
    [allRows, query, filter, dateFilter],
  );

  const summary = reviews.data?.pages?.[0]?.summary ?? {};
  const total = reviews.data?.pages?.[0]?.total ?? allRows.length;
  const rating = Number(summary.rating);
  const hasAny = allRows.length > 0;

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Reviews</h1>

      <div className="rounded-card border border-border bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-extrabold tabular-nums text-ink">
              {Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : '—'}
            </p>
            {Number.isFinite(rating) && rating > 0 ? <Stars score={Math.round(rating)} /> : null}
          </div>
          <div className="text-xs text-ink-soft">
            <p>{Number(summary.ratingCount || 0)} ratings</p>
            <p>{Number(summary.reviewCount ?? (total || 0))} written reviews</p>
          </div>
        </div>
        {hasAny ? <Distribution rows={allRows} /> : null}
      </div>

      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reviews"
          aria-label="Search reviews"
          className="pl-9"
        />
      </label>

      <ScrollTabs activeKey={filter} label="Filter reviews" className="-mx-4 gap-2 px-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            data-active={filter === f.id}
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'min-h-tap min-w-tap shrink-0 rounded-pill px-3 text-sm font-semibold transition-colors',
              filter === f.id ? 'bg-brand text-white' : 'bg-border-soft text-ink-soft',
            )}
          >
            {f.label}
          </button>
        ))}
      </ScrollTabs>

      <ScrollTabs activeKey={dateFilter} label="Filter by date" className="-mx-4 gap-2 px-4">
        {DATE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            data-active={dateFilter === f.id}
            aria-selected={dateFilter === f.id}
            onClick={() => setDateFilter(f.id)}
            className={cn(
              'min-h-tap min-w-tap shrink-0 rounded-pill px-3 text-xs font-semibold transition-colors',
              dateFilter === f.id ? 'bg-inverse text-inverse-ink' : 'bg-border-soft text-ink-soft',
            )}
          >
            {f.label}
          </button>
        ))}
      </ScrollTabs>

      {reviews.isLoading ? <SkeletonList rows={4} /> : null}

      {reviews.isError ? (
        <ErrorState
          message="Could not load reviews."
          onRetry={() => void reviews.refetch()}
          retrying={reviews.isFetching}
        />
      ) : null}

      {reviews.isSuccess && !hasAny ? (
        <EmptyState
          title="No customer reviews yet"
          description="Reviews from completed orders will appear here."
          illustration={<StorefrontIllustration variant="neutral" />}
        />
      ) : null}

      {reviews.isSuccess && hasAny && rows.length === 0 ? (
        <EmptyState
          title="No matches"
          description="No reviews match the current search or filters."
          icon={Search}
        />
      ) : null}

      <div className="space-y-3">
        {rows.map((review, i) => (
          <ReviewCard key={reviewId(review) || i} review={review} onOpen={setActive} />
        ))}
      </div>

      {reviews.hasNextPage ? (
        <button
          type="button"
          onClick={() => void reviews.fetchNextPage()}
          disabled={reviews.isFetchingNextPage}
          className="min-h-tap w-full rounded-btn border border-border bg-card text-sm font-semibold text-ink disabled:opacity-60"
        >
          {reviews.isFetchingNextPage ? 'Loading…' : 'Load more reviews'}
        </button>
      ) : null}

      <ReviewSheet review={active} onClose={() => setActive(null)} />
    </section>
  );
}
