import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { createMenuItem, fetchMenu, toggleStock, type NewMenuItem } from '@/services/api/menu';
import type { MenuItem } from '@/types/menu';

export function useMenu() {
  return useQuery({
    queryKey: queryKeys.menu,
    queryFn: fetchMenu,
    staleTime: 60_000,
  });
}

/**
 * Toggle in-stock. The server response (when it includes the updated item) is
 * merged back into the cache so the card reflects the authoritative value.
 */
export function useToggleStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, inStock }: { id: string; inStock: boolean }) => toggleStock(id, inStock),
    onSuccess: (res, variables) => {
      queryClient.setQueryData<MenuItem[]>(queryKeys.menu, (items) =>
        items?.map((item) => {
          if (item._id !== variables.id) return item;
          return res?.data ? { ...item, ...res.data } : { ...item, inStock: variables.inStock };
        }),
      );
    },
  });
}

/** POST /menu — create-only; the new item comes back `pending` admin approval. */
export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: NewMenuItem) => createMenuItem(item),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.menu });
    },
  });
}
