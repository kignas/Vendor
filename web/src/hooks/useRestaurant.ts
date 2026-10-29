import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  fetchRestaurant,
  setAvailability,
  setOpeningHours,
  type AvailabilityStatus,
} from '@/services/api/restaurant';
import { setRestaurant } from '@/lib/auth';

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

  const availabilityMutation = useMutation({
    mutationFn: (status: AvailabilityStatus) => setAvailability(status),
    onSuccess: invalidate,
  });

  const hoursMutation = useMutation({
    mutationFn: (openingHours: OpeningHours) => setOpeningHours(openingHours),
    onSuccess: invalidate,
  });

  return { ...query, availabilityMutation, hoursMutation };
}
