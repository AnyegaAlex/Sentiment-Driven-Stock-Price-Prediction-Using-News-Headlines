import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/client';
import { queryKeys } from '@/lib/queryKeys';
import { transformStockAnalysis } from '@/utils/apiTransformer';

const fetchStockOpinion = async ({ symbol, riskType, holdTime }) => {
  const response = await apiClient.get('/stock-analysis/', {
    params: { symbol, risk_type: riskType, hold_time: holdTime },
  });
  return transformStockAnalysis(response);
};

export const useStockOpinionQuery = (symbol, riskType = 'medium', holdTime = 'medium-term') => {
  return useQuery({
    queryKey: queryKeys.stockOpinion(symbol, riskType, holdTime),
    queryFn: () => fetchStockOpinion({ symbol, riskType, holdTime }),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};