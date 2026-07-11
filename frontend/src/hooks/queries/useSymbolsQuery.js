import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';

// Static fallback list of popular stocks (same as search)
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
    const response = await api.get('/stocks/symbols/');
    // Our interceptor returns response.data directly, so `response` is the data.
    // The API might return an array or an object with a `symbols` property.
    const symbols = Array.isArray(response) 
      ? response 
      : (response?.symbols ? response.symbols : []);
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
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
    placeholderData: FALLBACK_SYMBOLS, // Show immediately while fetching
  });
};