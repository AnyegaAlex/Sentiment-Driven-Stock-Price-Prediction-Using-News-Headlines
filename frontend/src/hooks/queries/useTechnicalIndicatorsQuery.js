import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import { fetchMockTechnicalData } from '@/services/mockTechnicalData';

const fetchTechnicalIndicators = async ({ symbol, timeframe }) => {
  try {
    const response = await api.get('/technical-indicators/', {
      params: { symbol, timeframe },
    });
    return response;
  } catch (error) {
    console.warn(`API failed for ${symbol}, using mock technical data.`);
    const mockData = await fetchMockTechnicalData(symbol, timeframe);
    return mockData;
  }
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