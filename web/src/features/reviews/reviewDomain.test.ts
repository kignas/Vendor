import { describe, expect, it } from 'vitest';
import {
  reviewCustomerCount,
  reviewCustomerName,
  reviewId,
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
});
