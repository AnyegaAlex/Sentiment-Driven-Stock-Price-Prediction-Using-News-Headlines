/**
 * NewsList – Displays a grid of news articles with sentiment analysis
 *
 * Features:
 * - Responsive grid layout
 * - Memoized for performance
 * - Error handling with retry
 * - Loading skeleton states
 * - Deduplication of news entries
 * - Configurable limits
 *
 * @component
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import apiClient from '@/services/client';
import NewsItem from './NewsItem';

// ============================================================================
// Sub-Components
// ============================================================================

const NewsListSkeleton = ({ count = 6 }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: count }).map((_, index) => (
      <Card key={`skeleton-${index}`} className="space-y-3 p-4 dark:bg-gray-800">
        <Skeleton className="h-40 w-full rounded-md bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-5 w-4/5 bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-gray-700" />
        </div>
      </Card>
    ))}
  </div>
);

NewsListSkeleton.propTypes = { count: PropTypes.number };

// ============================================================================
// Main Component
// ============================================================================

const NewsList = ({ symbol, newsData = null, loading: parentLoading = false, limit = 12 }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const displaySymbol = useMemo(() => symbol?.toUpperCase() || 'IBM', [symbol]);

  // Deduplicate news by URL
  const deduplicateNews = useCallback((items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = item.url || item.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  // Use parent data if provided
  useEffect(() => {
    if (Array.isArray(newsData)) {
      const deduped = deduplicateNews(newsData);
      setNews(deduped.slice(0, limit));
      setLoading(false);
      setError(null);
    }
  }, [newsData, deduplicateNews, limit]);

  // Fetch news from API
  const fetchNews = useCallback(async () => {
    if (Array.isArray(newsData)) return;
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/news/get-news/', {
        params: { symbol: displaySymbol, limit },
        timeout: 10000,
      });

      const newsArray = response.data?.news || response.data || [];
      if (Array.isArray(newsArray) && newsArray.length > 0) {
        const deduped = deduplicateNews(newsArray);
        setNews(deduped.slice(0, limit));
      } else {
        setNews([]);
        setError({ message: 'No news available for this symbol.', code: 404 });
      }
    } catch (apiError) {
      console.warn(`API failed for ${displaySymbol}:`, apiError.message);
      setError({ message: 'Unable to fetch live news. Please try again.', code: apiError.code || 500 });
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, [displaySymbol, limit, newsData, deduplicateNews]);

  useEffect(() => {
    if (!Array.isArray(newsData)) {
      fetchNews();
    }
  }, [fetchNews, newsData]);

  const isLoading = parentLoading || loading;

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="mb-4 text-xl font-semibold dark:text-white">Latest News for {displaySymbol}</h2>
        <NewsListSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <h2 className="mb-4 text-xl font-semibold dark:text-white">Latest News for {displaySymbol}</h2>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-500 dark:text-red-400">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={fetchNews}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!news.length) {
    return (
      <div className="p-4">
        <h2 className="mb-4 text-xl font-semibold dark:text-white">Latest News for {displaySymbol}</h2>
        <div className="rounded-lg border p-4 text-center text-muted-foreground dark:border-gray-700 dark:text-gray-400">
          No news articles found for this stock.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-semibold dark:text-white">Latest News for {displaySymbol}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {news.map((item, index) => (
          <NewsItem key={`news-${index}-${item.id || item.url}`} item={item} />
        ))}
      </div>
      {news.length >= limit && (
        <div className="mt-4 text-center text-sm text-muted-foreground dark:text-gray-400">
          Showing {limit} of {news.length} articles
        </div>
      )}
    </div>
  );
};

NewsList.propTypes = {
  symbol: PropTypes.string,
  newsData: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  limit: PropTypes.number,
};

NewsList.defaultProps = {
  symbol: 'IBM',
  newsData: null,
  loading: false,
  limit: 12,
};

export default React.memo(NewsList);