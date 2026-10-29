/**
 * Menu endpoint module. Only mounted routes are called here:
 *   GET  /menu
 *   PUT  /menu/:id/toggle-stock   (accepts { inStock } / { autoTurnOnAt })
 *   PUT  /menu/:id/inventory
 *   PUT  /menu/availability/bulk
 *   PUT  /menu/reorder
 * POST /menu and PUT /menu/:id are NOT mounted upstream (BACKEND-GAPS.md §1).
 */
import { apiFetch } from '@/lib/api';
import type { MenuItem, MenuResponse } from '@/types/menu';

export async function fetchMenu(): Promise<MenuItem[]> {
  const res = await apiFetch<MenuResponse>('/menu');
  return Array.isArray(res?.data) ? res.data : [];
}

/**
 * PUT /menu/:id/toggle-stock. Sends the desired state explicitly so a stale
 * card cannot invert the server value. Optionally schedules auto-restock.
 */
export function toggleStock(
  id: string,
  inStock: boolean,
  autoTurnOnAt?: string,
): Promise<{ data?: MenuItem; message?: string }> {
  const body: Record<string, unknown> = { inStock };
  if (autoTurnOnAt) body.autoTurnOnAt = autoTurnOnAt;
  return apiFetch(`/menu/${id}/toggle-stock`, { method: 'PUT', body });
}

/** PUT /menu/:id/inventory — body { stockQuantity, trackStock, lowStockThreshold }. */
export function saveInventory(
  id: string,
  payload: { stockQuantity?: number; trackStock?: boolean; lowStockThreshold?: number },
): Promise<unknown> {
  return apiFetch(`/menu/${id}/inventory`, { method: 'PUT', body: payload });
}

/** PUT /menu/availability/bulk — body { itemIds, inStock }. */
export function bulkAvailability(itemIds: string[], inStock: boolean): Promise<unknown> {
  return apiFetch('/menu/availability/bulk', { method: 'PUT', body: { itemIds, inStock } });
}

/** PUT /menu/reorder — body { items: [{ id, sortOrder }] }. */
export function reorderMenu(items: { id: string; sortOrder: number }[]): Promise<unknown> {
  return apiFetch('/menu/reorder', { method: 'PUT', body: { items } });
}

export interface StockMovement {
  change?: number;
  after?: number;
  reason?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/** GET /menu/inventory/history?itemId=&limit= — recent stock movements. */
export async function fetchStockHistory(itemId: string, limit = 10): Promise<StockMovement[]> {
  const res = await apiFetch<{ data?: StockMovement[] }>(
    `/inventory/history?itemId=${encodeURIComponent(itemId)}&limit=${limit}`,
  );
  return Array.isArray(res?.data) ? res.data : [];
}

/** PUT /menu/:id/toggle-stock with an explicit auto-restock cancel. */
export function cancelRestock(id: string): Promise<{ data?: import('@/types/menu').MenuItem }> {
  return apiFetch(`/menu/${id}/toggle-stock`, { method: 'PUT', body: { inStock: false, autoTurnOnAt: null } });
}
