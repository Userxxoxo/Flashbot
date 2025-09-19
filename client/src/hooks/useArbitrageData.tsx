import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { type ArbitrageOpportunity, type Trade, type TradingSettings } from '@shared/schema';

export function useArbitrageData() {
  const queryClient = useQueryClient();

  const opportunitiesQuery = useQuery<ArbitrageOpportunity[]>({
    queryKey: ['/api/opportunities'],
    refetchInterval: 5000, // Refetch every 5 seconds as backup to WebSocket
  });

  const tradesQuery = useQuery<Trade[]>({
    queryKey: ['/api/trades'],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const statsQuery = useQuery<{
    totalProfit: number;
    totalTrades: number;
    successRate: number;
    dailyProfit: number;
  }>({
    queryKey: ['/api/stats'],
    refetchInterval: 5000,
  });

  const executeArbitrageMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      const response = await apiRequest('POST', `/api/execute-arbitrage/${opportunityId}`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
  });

  return {
    opportunities: opportunitiesQuery.data || [],
    trades: tradesQuery.data || [],
    stats: statsQuery.data || { totalProfit: 0, totalTrades: 0, successRate: 0, dailyProfit: 0 },
    isLoading: opportunitiesQuery.isLoading || tradesQuery.isLoading || statsQuery.isLoading,
    executeArbitrage: executeArbitrageMutation.mutate,
    isExecuting: executeArbitrageMutation.isPending,
  };
}

export function useTradingSettings(userId: string) {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<TradingSettings>({
    queryKey: ['/api/settings', userId],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<TradingSettings>) => {
      const response = await apiRequest('POST', `/api/settings/${userId}`, settings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings', userId] });
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
}
