import { describe, expect, it } from 'vitest';
import {
  ratingDistribution,
  reviewCustomerCount,
  reviewCustomerName,
  reviewId,
  reviewInDateRange,
  reviewItemRatings,
  reviewMatches,
  reviewPhotos,
  reviewReplyAt,
  reviewReplyText,
  reviewScoreClass,
  reviewScoreOf,
} from './reviewDomain';
import type { Review } from '@/types/review';

const base: Review = { _id: 'r1', score: 4, comment: 'Great food', createdAt: '2026-10-01T10:00:00Z' };

describe('reviewDomain', () => {
  it('reads a string reply and a nested reply object identically', () => {
    expect(reviewReplyText({ ...base, vendorReply: 'Thanks!' })).toBe('Thanks!');
    expect(reviewReplyText({ ...base, vendorReply: { message: 'Thanks!' } })).toBe('Thanks!');
    expect(reviewReplyText(base)).toBe('');
  });

  it('falls back to top-level reply timestamps', () => {
    expect(reviewReplyAt({ ...base, vendorReply: 'ok', vendorReplyAt: '2026-10-02T10:00:00Z' })).toBe(
      '2026-10-02T10:00:00Z',
    );
    expect(reviewReplyAt({ ...base, vendorReply: { createdAt: '2026-10-03T10:00:00Z' } })).toBe(
      '2026-10-03T10:00:00Z',
    );
  });

  it('clamps the score to 1–5 like the legacy helper', () => {
    expect(reviewScoreOf({ ...base, score: 9 })).toBe(5);
    expect(reviewScoreOf({ ...base, score: 0 })).toBe(1);
    // legacy reads `score || rating`, so a present score wins
    expect(reviewScoreOf({ _id: 'x', rating: 3 })).toBe(3);
  });

  it('maps score to the good/mid/bad class', () => {
    expect(reviewScoreClass(5)).toBe('good');
    expect(reviewScoreClass(3)).toBe('mid');
    expect(reviewScoreClass(1)).toBe('bad');
  });

  it('reads the customer name and order count from user or customer', () => {
    expect(reviewCustomerName({ ...base, user: { name: 'Asha' } })).toBe('Asha');
    expect(reviewCustomerName({ ...base, customer: { name: 'Rahul' } })).toBe('Rahul');
    expect(reviewCustomerName(base)).toBe('Customer');
    expect(reviewCustomerCount({ ...base, user: { orderCount: 7 } })).toBe(7);
    expect(reviewCustomerCount(base)).toBeNull();
  });

  it('collects item ratings and photo urls from every supported shape', () => {
    expect(reviewItemRatings({ ...base, itemRatings: [{ name: 'Dosa' }] })).toHaveLength(1);
    expect(reviewPhotos({ ...base, photos: ['a.jpg', { url: 'b.jpg' }, { secure_url: 'c.jpg' }] })).toEqual([
      'a.jpg',
      'b.jpg',
      'c.jpg',
    ]);
    expect(reviewPhotos(base)).toEqual([]);
  });

  it('filters by replied state, star rating and free text', () => {
    const replied = { ...base, vendorReply: { message: 'Thanks' } };
    const unreplied = { ...base, _id: 'r2', score: 2, comment: 'Cold food' };
    expect(reviewMatches(replied, '', 'replied')).toBe(true);
    expect(reviewMatches(replied, '', 'unreplied')).toBe(false);
    expect(reviewMatches(unreplied, '', '2')).toBe(true);
    expect(reviewMatches(unreplied, 'cold', 'all')).toBe(true);
    expect(reviewMatches(unreplied, 'dosa', 'all')).toBe(false);
  });

  it('resolves an id from _id or id', () => {
    expect(reviewId({ _id: 'a' })).toBe('a');
    expect(reviewId({ id: 'b' })).toBe('b');
    expect(reviewId({})).toBe('');
  });

  it('builds a 5..1 rating distribution with shares', () => {
    const dist = ratingDistribution([
      { score: 5 },
      { score: 5 },
      { score: 3 },
      { score: 1 },
    ]);
    expect(dist.map((b) => b.stars)).toEqual([5, 4, 3, 2, 1]);
    expect(dist.find((b) => b.stars === 5)?.count).toBe(2);
    expect(dist.find((b) => b.stars === 5)?.pct).toBe(50);
    expect(dist.find((b) => b.stars === 4)?.count).toBe(0);
  });

  it('returns all-zero buckets when there are no rows', () => {
    const dist = ratingDistribution([]);
    expect(dist.every((b) => b.count === 0 && b.pct === 0)).toBe(true);
  });

  it('filters by date window and treats a missing date as out of range', () => {
    const now = Date.parse('2026-10-29T00:00:00Z');
    const recent = { createdAt: '2026-10-27T00:00:00Z' };
    const old = { createdAt: '2026-09-01T00:00:00Z' };
    expect(reviewInDateRange(recent, '7d', now)).toBe(true);
    expect(reviewInDateRange(old, '7d', now)).toBe(false);
    expect(reviewInDateRange(old, '30d', now)).toBe(false);
    expect(reviewInDateRange(old, 'all', now)).toBe(true);
    expect(reviewInDateRange({}, '7d', now)).toBe(false);
  });
});
