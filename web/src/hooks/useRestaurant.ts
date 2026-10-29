import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  fetchRestaurant,
  setAvailability,
  setOpeningHours,
  type AvailabilityStatus,
} from '@/services/api/restaurant';
import { setRestaurant } from '@/lib/auth';
import type { Restaurant } from '@/types/restaurant';

export type OpeningHours = Record<string, { closed?: boolean; opensAt?: string; closesAt?: string }>;

/**
 * The current restaurant. On success the cached restaurant is mirrored into
 * localStorage so the top bar / self-delivery gate have data even offline,
 * exactly as the legacy `loadRestaurant()` did.
 */
export function useRestaurant() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.restaurant,
    queryFn: async () => {
      const restaurant = await fetchRestaurant();
      if (restaurant) setRestaurant(restaurant);
      return restaurant;
    },
    staleTime: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.restaurant });

  /**
   * Availability is server-authoritative. The pill updates optimistically so
   * the switch feels instant, rolls back to the previous server value on
   * failure, and always reconciles from a refetch once the request settles —
   * the client never claims a state the backend rejected.
   */
  const availabilityMutation = useMutation({
    mutationFn: (status: AvailabilityStatus) => setAvailability(status),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.restaurant });
      const previous = queryClient.getQueryData<Restaurant | null>(queryKeys.restaurant);
      queryClient.setQueryData<Restaurant | null>(queryKeys.restaurant, (old) =>
        old ? { ...old, availability: status } : old,
      );
      return { previous };
    },
    onError: (_err, _status, ctx) => {
      if (ctx) queryClient.setQueryData(queryKeys.restaurant, ctx.previous);
    },
    onSettled: invalidate,
  });

  const hoursMutation = useMutation({
    mutationFn: (openingHours: OpeningHours) => setOpeningHours(openingHours),
    onSuccess: invalidate,
  });

  return { ...query, availabilityMutation, hoursMutation };
}
