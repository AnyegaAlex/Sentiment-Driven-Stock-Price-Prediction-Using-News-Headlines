import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

// Static list of popular stocks (you can expand this)
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

const filterSymbols = (query) => {
  const lower = query.toLowerCase();
  return FALLBACK_SYMBOLS
    .filter(item =>
      item.symbol.toLowerCase().includes(lower) ||
      item.name.toLowerCase().includes(lower)
    )
    .slice(0, 5);
};

export const useSearchSymbolsQuery = (searchQuery) => {
  return useQuery({
    queryKey: queryKeys.search(searchQuery),
    queryFn: () => filterSymbols(searchQuery),
    enabled: searchQuery.length > 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    placeholderData: [],
  });
};