import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/client';
import { queryKeys } from '@/lib/queryKeys';
import { transformNews } from '@/utils/apiTransformer';

const fetchNews = async (symbol) => {
  const response = await apiClient.get('/news/get-news/', {
    params: { symbol },
  });
  return transformNews(response);
};

export const useNewsQuery = (symbol) => {
  return useQuery({
    queryKey: queryKeys.news(symbol),
    queryFn: () => fetchNews(symbol),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};