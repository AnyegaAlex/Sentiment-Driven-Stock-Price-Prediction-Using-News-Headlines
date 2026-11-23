/**
 * Sentiment Analysis Query Hook
 * 
 * Fetches sentiment analysis data for a given stock symbol and time range.
 * Uses React Query for caching and automatic re-fetching.
 * 
 * @param {string} symbol - Stock ticker symbol (e.g., 'AAPL')
 * @param {string} timeRange - Time range: '7d' or '30d'
 * @returns {object} React Query result object with data, isLoading, error, refetch
 * 
 * Example:
 * const { data, isLoading, error, refetch } = useSentimentAnalysisQuery('AAPL', '7d');
 * 
 * Response Structure:
 * {
 *   success: true,
 *   data: {
 *     sentiment: { score: 0.65, label: 'Bullish' },
 *     news_count: 142,
 *     source_stats: {
 *       tier1_count: 12,
 *       reliability_sum: 9.6,
 *       tier1_sources: ['Reuters', 'Bloomberg']
 *     },
 *     history: [{ date: '2026-07-05T00:00:00Z', score: 0.55 }]
 *   },
 *   code: 200,
 *   timestamp: '2026-07-14T10:00:00Z'
 * }
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/client';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Transforms raw API response to the format expected by SentimentAnalysisCard
 * @param {Object} response - Raw API response
 * @returns {Object} Transformed sentiment data
 */
export const transformSentimentData = (response) => {
  const data = response?.data || response || {};

  return {
    sentiment: data.sentiment ?? null,
    news_count:
      data.news_count !== null &&
      data.news_count !== undefined &&
      Number.isFinite(Number(data.news_count))
        ? Number(data.news_count)
        : null,
    source_stats: data.source_stats ?? null,
    distribution: data.distribution ?? null,
    history: Array.isArray(data.history) ? data.history : [],
    success: response?.success !== false,
  };
};

const fetchSentimentAnalysis = async ({ symbol, timeRange }) => {
  // Let React Query retain the failure state so the UI can show an actionable error.
  return apiClient.get('/sentiment-analysis/', {
    params: {
      symbol: symbol.toUpperCase(),
      time_range: timeRange,
    },
  });
};

/**
 * React Query hook for sentiment analysis
 * 
 * @param {string} symbol - Stock ticker symbol
 * @param {string} timeRange - '7d' or '30d' (default: '7d')
 * @param {Object} options - Additional React Query options
 * @returns {Object} React Query result
 */
export const useSentimentAnalysisQuery = (
  symbol,
  timeRange = '7d',
  options = {}
) => {
  return useQuery({
    queryKey: queryKeys.sentimentAnalysis(symbol, timeRange),
    queryFn: () => fetchSentimentAnalysis({ symbol, timeRange }),
    enabled: !!symbol && symbol.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    ...options,
  });
};

/**
 * Type definitions for better IDE support
 */
export const SENTIMENT_ANALYSIS_TYPES = {
  Response: {
    success: 'boolean',
    data: {
      sentiment: { score: 'number', label: 'string' },
      news_count: 'number',
      source_stats: {
        tier1_count: 'number',
        reliability_sum: 'number',
        tier1_sources: 'array'
      },
      history: 'array'
    },
    code: 'number',
    timestamp: 'string'
  }
};