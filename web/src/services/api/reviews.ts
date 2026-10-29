/**
 * Reviews endpoint module. Paths exist in VENDOR-API-CONTRACT.md
 * (`GET /vendor/reviews`, `POST /vendor/reviews/:id/reply`).
 */
import { apiFetch } from '@/lib/api';
import type { Review, ReviewSummary, ReviewsResponse } from '@/types/review';

export interface ReviewsPage {
  rows: Review[];
  summary: ReviewSummary;
  total: number;
  currentPage: number;
  totalPages: number;
}

export async function fetchReviews(page = 1, limit = 20): Promise<ReviewsPage> {
  const res = await apiFetch<ReviewsResponse>(`/reviews?page=${page}&limit=${limit}`);
  const rows = Array.isArray(res?.data) ? res.data : [];
  const total = Number(res?.total ?? res?.summary?.reviewCount ?? rows.length) || rows.length;
  return {
    rows,
    summary: res?.summary ?? {},
    total,
    currentPage: Number((res as { currentPage?: number })?.currentPage) || page,
    totalPages: Number((res as { totalPages?: number })?.totalPages) || Math.max(1, Math.ceil(total / limit)),
  };
}

/** POST /reviews/:id/reply — body { message }, 1–500 characters. */
export async function replyToReview(id: string, message: string): Promise<void> {
  await apiFetch(`/reviews/${id}/reply`, { method: 'POST', body: { message } });
}
