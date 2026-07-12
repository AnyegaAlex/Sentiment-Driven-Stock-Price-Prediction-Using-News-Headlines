import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';

const fetchStockDashboard = async ({ symbol, riskType, holdTime }) => {
  const response = await api.get('/api/stock-analysis/', {
    params: {
      symbol,
      risk_type: riskType,
      hold_time: holdTime,
    },
  });
  // response now contains: opinion, technical_indicators, sentiment_summary, lstm_prediction, etc.
  return response;
};

export const useStockDashboardQuery = (symbol, riskType = 'medium', holdTime = 'medium-term') => {
  return useQuery({
    queryKey: queryKeys.stockDashboard(symbol, riskType, holdTime), // define this key
    queryFn: () => fetchStockDashboard({ symbol, riskType, holdTime }),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};