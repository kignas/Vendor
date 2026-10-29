import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { fetchRestaurant, setAvailability, type AvailabilityStatus } from '@/services/api/restaurant';
import { setRestaurant } from '@/lib/auth';

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

  const availabilityMutation = useMutation({
    mutationFn: (status: AvailabilityStatus) => setAvailability(status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.restaurant }),
  });

  return { ...query, availabilityMutation };
}
