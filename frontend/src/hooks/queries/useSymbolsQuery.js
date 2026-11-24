import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/client';
import { queryKeys } from '@/lib/queryKeys';
import { transformSymbols } from '@/utils/apiTransformer';

const fetchSymbols = async () => {
  const response = await apiClient.get('/symbols/');
  return transformSymbols(response);
};

export const useSymbolsQuery = () =>
  useQuery({
    queryKey: queryKeys.symbols(),
    queryFn: fetchSymbols,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
