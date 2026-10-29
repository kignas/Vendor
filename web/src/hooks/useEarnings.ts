import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  fetchEarningsOrders,
  fetchEarningsSummary,
  fetchSettlementSummary,
  fetchWithdrawals,
  type EarningsPeriod,
} from '@/services/api/earnings';

export function useEarningsSummary(period: EarningsPeriod) {
  return useQuery({
    queryKey: queryKeys.earnings(period),
    queryFn: () => fetchEarningsSummary(period),
    staleTime: 60_000,
  });
}

export function useEarningsOrders(enabled = true) {
  return useQuery({
    queryKey: ['earnings', 'orders'],
    queryFn: () => fetchEarningsOrders(1, 20),
    enabled,
    staleTime: 60_000,
  });
}

export function useSettlementSummary() {
  return useQuery({
    queryKey: queryKeys.settlements,
    queryFn: fetchSettlementSummary,
    staleTime: 60_000,
  });
}

export function useWithdrawals() {
  return useQuery({
    queryKey: ['settlements', 'withdrawals'],
    queryFn: fetchWithdrawals,
    staleTime: 60_000,
  });
}
