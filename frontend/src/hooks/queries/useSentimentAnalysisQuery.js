import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import { fetchMockSentimentData } from '@/services/mockSentimentData';

const fetchSentimentAnalysis = async ({ symbol, timeRange }) => {
  try {
    const response = await api.get('/sentiment-analysis', {
      params: { symbol, time_range: timeRange },
    });
    return response;
  } catch (error) {
    console.warn(`API failed for ${symbol}, using mock sentiment data.`);
    const mockData = await fetchMockSentimentData(symbol, timeRange);
    return mockData;
  }
};

export const useSentimentAnalysisQuery = (symbol, timeRange = '7d') => {
  return useQuery({
    queryKey: queryKeys.sentimentAnalysis(symbol, timeRange),
    queryFn: () => fetchSentimentAnalysis({ symbol, timeRange }),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};