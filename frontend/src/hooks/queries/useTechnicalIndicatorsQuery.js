import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/client';
import { queryKeys } from '@/lib/queryKeys';
import { transformTechnicalIndicators } from '@/utils/apiTransformer';

const fetchTechnicalIndicators = async ({ symbol, timeframe }) => {
  const response = await apiClient.get('/technical-indicators/', {
    params: { symbol, timeframe },
  });
  return transformTechnicalIndicators(response);
};

export const useTechnicalIndicatorsQuery = (symbol, timeframe = '1d') => {
  return useQuery({
    queryKey: queryKeys.technicalIndicators(symbol, timeframe),
    queryFn: () => fetchTechnicalIndicators({ symbol, timeframe }),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};