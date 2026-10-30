/**
 * Menu endpoint module. Only mounted routes are called here:
 *   GET  /menu
 *   PUT  /menu/:id/toggle-stock   (accepts { inStock } / { autoTurnOnAt })
 *   PUT  /menu/:id/inventory
 *   PUT  /menu/availability/bulk
 * POST /menu and PUT /menu/:id are NOT mounted upstream (BACKEND-GAPS.md §1).
 * PUT /menu/reorder is mounted and documented but has no vendor UI yet, so it
 * is deliberately not wrapped here (unused code would rot).
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

/**
 * The definition fields POST /vendor/menu actually reads. Sending anything
 * else is pointless (the controller ignores it) and risks weakening server
 * validation, so the app sends exactly this set.
 */
export interface NewMenuItem {
  name: string;
  price: number;
  category?: string;
  description?: string;
  originalPrice?: number;
  image?: string;
  isVeg?: boolean;
  inStock?: boolean;
  trackStock?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  sortOrder?: number;
}

/**
 * POST /vendor/menu — create-only. The backend marks the new item
 * `approvalStatus: 'pending'` for admin review; there is no PUT /menu/:id
 * (BACKEND-GAPS.md §1), so this is the only menu write beyond stock/inventory.
 */
export function createMenuItem(item: NewMenuItem): Promise<{ data?: MenuItem; message?: string }> {
  return apiFetch('/menu', { method: 'POST', body: item });
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
