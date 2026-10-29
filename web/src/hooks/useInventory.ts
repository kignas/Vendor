import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  bulkAvailability,
  cancelRestock,
  fetchStockHistory,
  saveInventory,
  toggleStock,
} from '@/services/api/menu';
import type { MenuItem } from '@/types/menu';

/** Stock movements for one item, loaded when its inventory sheet opens. */
export function useStockHistory(itemId: string | null) {
  return useQuery({
    queryKey: ['inventory', 'history', itemId] as const,
    queryFn: () => fetchStockHistory(itemId as string),
    enabled: itemId !== null,
    staleTime: 15_000,
  });
}

export interface InventoryPayload {
  trackStock: boolean;
  manualAvailability: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
}

/** Per-item inventory write (PUT /menu/:id/inventory). */
export function useSaveInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InventoryPayload }) =>
      saveInventory(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu }),
  });
}

/**
 * Bulk availability (PUT /menu/availability/bulk). Falls back to per-item
 * toggle-stock only when the bulk route is absent (404/405), mirroring the
 * legacy `applyBulkAvailability` so a real validation error is surfaced.
 */
export function useBulkAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ids,
      inStock,
      items,
    }: {
      ids: string[];
      inStock: boolean;
      items: MenuItem[];
    }) => {
      try {
        return await bulkAvailability(ids, inStock);
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 404 || status === 405) {
          for (const id of ids) {
            const item = items.find((i) => i._id === id);
            if (!item || item.inStock === inStock) continue;
            await toggleStock(id, inStock);
          }
          return { fallback: true };
        }
        throw err;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu }),
  });
}

/** Cancel a scheduled auto-restock (toggle-stock with autoTurnOnAt: null). */
export function useCancelRestock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelRestock(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu }),
  });
}
