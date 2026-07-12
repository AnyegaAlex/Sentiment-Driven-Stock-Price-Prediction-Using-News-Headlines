import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import { fetchMockStockAnalysis } from '@/services/mockStockAnalysis';

const fetchStockOpinion = async ({ symbol, riskType, holdTime }) => {
  try {
    const response = await api.get('/stock-analysis/', {
      params: { symbol, risk_type: riskType, hold_time: holdTime },
    });
    // API interceptor returns response.data directly, so `response` is the data
    return response;
  } catch (error) {
    console.warn(`API failed for ${symbol}, using mock stock opinion data.`);
    const mockData = await fetchMockStockAnalysis(symbol, riskType, holdTime);
    return mockData;
  }
};

export const useStockOpinionQuery = (symbol, riskType = 'medium', holdTime = 'medium-term') => {
  return useQuery({
    queryKey: queryKeys.stockOpinion(symbol, riskType, holdTime),
    queryFn: () => fetchStockOpinion({ symbol, riskType, holdTime }),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};