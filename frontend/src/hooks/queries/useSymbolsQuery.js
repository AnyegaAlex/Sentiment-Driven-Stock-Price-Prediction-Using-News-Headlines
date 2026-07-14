import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/client';
import { queryKeys } from '@/lib/queryKeys';
import { transformSymbols } from '@/utils/apiTransformer';

// Static fallback list of popular stocks
const FALLBACK_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc.', region: 'US' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', region: 'US' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', region: 'US' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', region: 'US' },
  { symbol: 'TSLA', name: 'Tesla Inc.', region: 'US' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', region: 'US' },
  { symbol: 'META', name: 'Meta Platforms', region: 'US' },
  { symbol: 'IBM', name: 'International Business Machines', region: 'US' },
  { symbol: 'BABA', name: 'Alibaba Group', region: 'CN' },
  { symbol: 'NFLX', name: 'Netflix Inc.', region: 'US' },
];

const fetchSymbols = async () => {
  try {
    const response = await apiClient.get('/symbols/');
    const symbols = transformSymbols(response);
    return symbols.length > 0 ? symbols : FALLBACK_SYMBOLS;
  } catch (error) {
    console.warn('API failed for symbols, using fallback list.');
    return FALLBACK_SYMBOLS;
  }
};

export const useSymbolsQuery = () => {
  return useQuery({
    queryKey: queryKeys.symbols(),
    queryFn: fetchSymbols,
    staleTime: 60 * 60 * 1000,
    retry: 1,
    placeholderData: FALLBACK_SYMBOLS,
  });
};