import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/client';
import { queryKeys } from '@/lib/queryKeys';
import { transformPredictionHistory } from '@/utils/apiTransformer';

const fetchPredictionHistory = async () => {
  const response = await apiClient.get('/prediction-history/');
  return transformPredictionHistory(response);
};

export const usePredictionHistoryQuery = () => {
  return useQuery({
    queryKey: queryKeys.predictionHistory(),
    queryFn: fetchPredictionHistory,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    placeholderData: [],
  });
};