import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import { fetchMockNewsAnalysis } from '@/services/mockNewsAnalysis';

// Hardcoded sample news (fallback if mock returns empty)
const SAMPLE_NEWS = [
  {
    title: 'Apple Reports Strong Quarterly Earnings',
    summary: 'Apple Inc. reported better-than-expected earnings driven by strong iPhone sales.',
    source: 'Reuters',
    published_at: new Date().toISOString(),
    sentiment: 'positive',
    confidence: 0.92,
    banner_image_url: 'https://via.placeholder.com/400x200?text=Apple+News',
    url: 'https://www.reuters.com/technology/apple-q4-earnings-2026',
    key_phrases: ['iPhone sales', 'earnings beat', 'services growth'],
    source_reliability: 85,
  },
  {
    title: 'Apple’s AI Push Sparks Investor Optimism',
    summary: 'Investors are optimistic about Apple’s artificial intelligence initiatives.',
    source: 'Bloomberg',
    published_at: new Date().toISOString(),
    sentiment: 'positive',
    confidence: 0.78,
    banner_image_url: 'https://via.placeholder.com/400x200?text=Apple+AI',
    url: 'https://www.bloomberg.com/apple-ai',
    key_phrases: ['AI', 'investor optimism', 'innovation'],
    source_reliability: 72,
  },
  // Add more if needed
];

const fetchNews = async (symbol) => {
  try {
    const response = await api.get('/news/get-news/', { params: { symbol } });
    // If API returns a non-empty array, use it; otherwise fallback
    const newsArray = response.news || response || [];
    if (newsArray.length > 0) {
      return newsArray;
    }
    console.warn(`API returned empty news for ${symbol}, using sample data.`);
    return SAMPLE_NEWS;
  } catch (error) {
    console.warn(`API failed for ${symbol}, using mock news data.`);
    const mockData = await fetchMockNewsAnalysis(symbol);
    // If mock data is empty or not an array, fallback to sample
    const newsData = mockData.news || mockData || [];
    return newsData.length > 0 ? newsData : SAMPLE_NEWS;
  }
};

export const useNewsQuery = (symbol) => {
  return useQuery({
    queryKey: queryKeys.news(symbol),
    queryFn: () => fetchNews(symbol),
    enabled: !!symbol,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
};