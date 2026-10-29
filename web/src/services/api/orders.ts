/**
 * Orders endpoint module. Every path here exists in VENDOR-API-CONTRACT.md /
 * routes/vendorRoutes.js — no invented routes. Mutations are single-flight at
 * the call site (AGENTS.md rule 7).
 */
import { apiFetch } from '@/lib/api';
import type { Order, OrdersHistoryResponse, OrdersQueueResponse } from '@/types/order';

export async function fetchQueue(): Promise<Order[]> {
  const res = await apiFetch<OrdersQueueResponse>('/orders?view=queue');
  return Array.isArray(res?.data) ? res.data : [];
}

export interface HistoryPage {
  rows: Order[];
  currentPage: number;
  totalPages: number;
  totalOrders: number;
}

export async function fetchHistory(page = 1, limit = 20): Promise<HistoryPage> {
  const res = await apiFetch<OrdersHistoryResponse>(
    `/orders?view=history&page=${page}&limit=${limit}`,
  );
  const rows = Array.isArray(res?.data) ? res.data : [];
  return {
    rows,
    currentPage: Number(res?.currentPage) || page,
    totalPages: Number(res?.totalPages) || 1,
    totalOrders: Number(res?.totalOrders) || rows.length,
  };
}

/**
 * PUT /orders/:id/accept — body { prepMinutes }.
 * The legacy body also carried a `prepTimeMinutes` alias; kept for parity.
 */
export function acceptOrder(id: string, prepMinutes: number): Promise<unknown> {
  return apiFetch(`/orders/${id}/accept`, {
    method: 'PUT',
    body: { prepMinutes, prepTimeMinutes: prepMinutes },
  });
}

/** PUT /orders/:id/reject — body { reason }. */
export function rejectOrder(id: string, reason: string): Promise<unknown> {
  return apiFetch(`/orders/${id}/reject`, {
    method: 'PUT',
    body: { reason },
  });
}

/**
 * PUT /orders/:id/status — body { status } as a hint only; the server derives
 * the next status from VENDOR_STATUS_TRANSITIONS and ignores the body.
 */
export function advanceOrderStatus(id: string, status: string): Promise<unknown> {
  return apiFetch(`/orders/${id}/status`, { method: 'PUT', body: { status } });
}

/** PUT /orders/:id/ready — mark food ready. */
export function markOrderReady(id: string): Promise<unknown> {
  return apiFetch(`/orders/${id}/ready`, { method: 'PUT' });
}

/** PUT /orders/:id/undo-ready — 15-second undo window. */
export function undoOrderReady(id: string): Promise<unknown> {
  return apiFetch(`/orders/${id}/undo-ready`, { method: 'PUT' });
}

/** PUT /orders/:id/extend-prep — one-time +5 min extension. */
export function extendPrep(id: string): Promise<unknown> {
  return apiFetch(`/orders/${id}/extend-prep`, { method: 'PUT' });
}

/** POST /orders/:id/verify-delivery-otp — self-delivery PIN. */
export function verifyDeliveryOtp(id: string, otp: string): Promise<unknown> {
  return apiFetch(`/orders/${id}/verify-delivery-otp`, {
    method: 'POST',
    body: { otp },
  });
}
