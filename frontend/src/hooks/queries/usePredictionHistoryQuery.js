import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import { fetchMockPredictions } from '@/services/mockPredictionHistory';

// Hardcoded sample predictions (fallback if mock returns empty)
const SAMPLE_PREDICTIONS = [
  {
    id: 1,
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
    stock_symbol: 'AAPL',
    headline: 'Apple iPhone 16 Sales Exceed Expectations',
    predicted_movement: 'up',
    confidence: 0.87,
    sentiment_score: 0.82,
    source: 'Analyst Consensus',
  },
  {
    id: 2,
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
    stock_symbol: 'AAPL',
    headline: 'Apple Services Revenue Continues to Grow',
    predicted_movement: 'up',
    confidence: 0.76,
    sentiment_score: 0.71,
    source: 'MarketWatch',
  },
  {
    id: 3,
    date: new Date(Date.now() - 86400000).toISOString(),
    stock_symbol: 'AAPL',
    headline: 'Apple AI Announcement Fuels Bullish Sentiment',
    predicted_movement: 'up',
    confidence: 0.91,
    sentiment_score: 0.85,
    source: 'Bloomberg',
  },
  // Add more as needed
];

const fetchPredictionHistory = async () => {
  try {
    const response = await api.get('/stocks/history/');
    // Ensure we return an array
    const data = Array.isArray(response) ? response : [];
    if (data.length > 0) {
      return data;
    }
    console.warn('API returned empty prediction history, using sample data.');
    return SAMPLE_PREDICTIONS;
  } catch (error) {
    console.warn('API failed for prediction history, using mock data.');
    try {
      const mockData = await fetchMockPredictions();
      const data = Array.isArray(mockData) ? mockData : [];
      return data.length > 0 ? data : SAMPLE_PREDICTIONS;
    } catch (mockError) {
      console.warn('Mock data also failed, using hardcoded sample.');
      return SAMPLE_PREDICTIONS;
    }
  }
};

export const usePredictionHistoryQuery = () => {
  return useQuery({
    queryKey: queryKeys.predictionHistory(),
    queryFn: fetchPredictionHistory,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    placeholderData: SAMPLE_PREDICTIONS, // Show immediately while fetching
  });
};