import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/client';
import { queryKeys } from '@/lib/queryKeys';
import { transformSymbols } from '@/utils/apiTransformer';

const fetchSearchSymbols = async (query) => {
  if (!query || query.length < 2) return [];
  const response = await apiClient.get('/news/symbol-search/', {
    params: { q: query },
  });
  return transformSymbols(response);
};

export const useSearchSymbolsQuery = (searchQuery) => {
  return useQuery({
    queryKey: queryKeys.search(searchQuery),
    queryFn: () => fetchSearchSymbols(searchQuery),
    enabled: searchQuery.length > 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    placeholderData: [],
  });
};