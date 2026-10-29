import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { fetchPolicies, fetchProfile, updateProfile, type ProfileUpdate } from '@/services/api/restaurant';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'] as const,
    queryFn: fetchProfile,
    staleTime: 60_000,
  });
}

export function usePolicies() {
  return useQuery({
    queryKey: ['policies'] as const,
    queryFn: fetchPolicies,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProfileUpdate) => updateProfile(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurant });
    },
  });
}
