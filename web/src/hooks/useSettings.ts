import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  fetchOnboardingConfig,
  fetchSettings,
  updateSettings,
  type SettingsUpdate,
} from '@/services/api/settings';

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: fetchSettings,
    staleTime: 30_000,
  });
}

export function useOnboardingConfig() {
  return useQuery({
    queryKey: ['onboarding', 'config'] as const,
    queryFn: fetchOnboardingConfig,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SettingsUpdate) => updateSettings(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
}
