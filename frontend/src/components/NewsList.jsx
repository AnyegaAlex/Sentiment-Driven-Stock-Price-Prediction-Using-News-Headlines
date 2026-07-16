/**
 * NewsList Component
 * 
 * Displays a grid of news articles with sentiment analysis for a given stock symbol.
 * Features:
 * - Sentiment badges (positive, neutral, negative) with icons
 * - Confidence score display with progress bars
 * - Source reliability badge with tooltip
 * - Key phrases extraction and display
 * - Responsive grid layout
 * - Loading skeleton states
 * - Error handling with retry functionality
 * - Image fallback handling
 * 
 * Data Flow:
 * 1. Parent component provides newsData via props (preferred)
 * 2. If no newsData, component fetches from API using apiClient
 * 3. Sample data used as fallback when API fails
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Info, ExternalLink, Newspaper } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import apiClient from "@/services/client";

// ============================================================================
// Constants
// ============================================================================

/**
 * Sentiment configuration for styling different sentiment types
 */
const SENTIMENT_CONFIG = {
  positive: {
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: "📈",
    progressClass: "bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_12px_rgba(34,197,94,0.45)]"
  },
  neutral: {
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    icon: "➖",
    progressClass: "bg-gradient-to-r from-slate-300 to-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.35)]"
  },
  negative: {
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    icon: "📉",
    progressClass: "bg-gradient-to-r from-rose-500 to-red-500 shadow-[0_0_12px_rgba(244,63,94,0.45)]"
  }
};

/**
 * Reliability color mapping
 */
const RELIABILITY_CONFIG = {
  high: {
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    label: "High"
  },
  medium: {
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    label: "Medium"
  },
  low: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    label: "Low"
  }
};

/**
 * Sample fallback news data used when API returns empty or fails
 */
const SAMPLE_NEWS = [
  {
    id: 'sample-1',
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
    id: 'sample-2',
    title: "Apple's AI Push Sparks Investor Optimism",
    summary: "Investors are optimistic about Apple's artificial intelligence initiatives.",
    source: 'Bloomberg',
    published_at: new Date().toISOString(),
    sentiment: 'positive',
    confidence: 0.78,
    banner_image_url: 'https://via.placeholder.com/400x200?text=Apple+AI',
    url: 'https://www.bloomberg.com/apple-ai',
    key_phrases: ['AI', 'investor optimism', 'innovation'],
    source_reliability: 72,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize key phrases to always be an array
 * @param {string|Array} phrases - Comma-separated string or array of phrases
 * @returns {Array} Array of phrase strings
 */
const normalizeKeyPhrases = (phrases) => {
  if (!phrases) return [];
  
  if (Array.isArray(phrases)) {
    return phrases.filter(p => p && p.trim());
  }
  
  if (typeof phrases === 'string') {
    return phrases.split(',').map(p => p.trim()).filter(Boolean);
  }
  
  return [];
};

/**
 * Parse date string to formatted date
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
const parseDate = (dateString) => {
  if (!dateString) return "Date not available";
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

/**
 * Get reliability level from score
 * @param {number} score - Reliability score (0-100)
 * @returns {string} Reliability level
 */
const getReliabilityLevel = (score) => {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Individual news item component (memoized for performance)
 */
const NewsItem = React.memo(function NewsItem({ item }) {
  const sentiment = item.sentiment?.toLowerCase() || 'neutral';
  const config = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.neutral;
  
  // Normalize key phrases
  const keyPhrases = normalizeKeyPhrases(item.key_phrases || item.keyPhrases);
  
  // Get reliability configuration
  const reliabilityScore = item.source_reliability || 0;
  const reliabilityLevel = getReliabilityLevel(reliabilityScore);
  const reliabilityConfig = RELIABILITY_CONFIG[reliabilityLevel];

  return (
    <Card className="flex h-full flex-col hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="flex flex-1 flex-col space-y-3 p-4">
        {/* Image */}
        {item.banner_image_url || item.image ? (
          <div className="relative pt-[50%] rounded-md overflow-hidden">
            <img
              src={item.banner_image_url || item.image}
              alt={item.title || "News image"}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.classList.add('!pt-0');
              }}
            />
          </div>
        ) : (
          <div className="flex h-0 pt-[50%] items-center justify-center rounded-md bg-muted dark:bg-gray-700">
            <Newspaper className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-base line-clamp-2 dark:text-white">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline inline-flex items-center gap-1 text-primary"
          >
            {item.title || "No title available"}
            <ExternalLink className="inline-block h-3 w-3 flex-shrink-0" />
          </a>
        </h3>

        {/* Summary */}
        <p className="text-sm text-muted-foreground line-clamp-3 dark:text-gray-400 flex-1">
          {item.summary || "No summary available."}
        </p>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground dark:text-gray-500">Source</p>
            <p className="font-medium dark:text-gray-300 truncate">
              {item.source || item.source_name || "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground dark:text-gray-500">Published</p>
            <p className="font-medium dark:text-gray-300">
              {parseDate(item.published_at || item.date)}
            </p>
          </div>
        </div>

        {/* Reliability Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground dark:text-gray-500">Reliability:</span>
          <Badge className={cn("text-xs", reliabilityConfig.badge)}>
            {reliabilityScore}%
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] dark:bg-gray-900 dark:border-gray-700">
              <p className="text-xs">Source reliability score based on historical accuracy.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Sentiment & Confidence */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground dark:text-gray-500">Sentiment:</span>
            <Badge className={cn("px-2 py-0.5 text-xs rounded-full capitalize", config.badgeClass)}>
              {config.icon} {sentiment}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground dark:text-gray-500">Confidence:</span>
            <div className="flex-1 relative h-1.5 rounded bg-gray-200 dark:bg-gray-700">
              <div
                className={cn("absolute inset-0 h-full rounded transition-all", config.progressClass)}
                style={{ width: `${Math.min(100, Math.round((item.confidence || 0) * 100))}%` }}
              />
            </div>
            <span className="text-xs w-12 text-right dark:text-gray-400">
              {Math.round((item.confidence || 0) * 100)}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] dark:bg-gray-900 dark:border-gray-700">
                <p className="text-xs">Model confidence in sentiment analysis.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Key Phrases */}
        {keyPhrases.length > 0 && (
          <div className="pt-2 border-t border-border dark:border-gray-700">
            <h4 className="text-xs font-medium mb-1.5 dark:text-gray-300">Key Phrases</h4>
            <div className="flex flex-wrap gap-1.5">
              {keyPhrases.slice(0, 3).map((phrase, index) => (
                <Badge
                  key={`phrase-${index}`}
                  variant="outline"
                  className="text-[10px] px-2 py-0.5 rounded-full dark:border-gray-600 dark:text-gray-300"
                >
                  {phrase}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

NewsItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    summary: PropTypes.string,
    source: PropTypes.string,
    source_name: PropTypes.string,
    date: PropTypes.string,
    published_at: PropTypes.string,
    url: PropTypes.string,
    sentiment: PropTypes.string,
    confidence: PropTypes.number,
    keyPhrases: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.string
    ]),
    key_phrases: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.string
    ]),
    image: PropTypes.string,
    banner_image_url: PropTypes.string,
    symbol: PropTypes.string,
    source_reliability: PropTypes.number,
  }).isRequired,
};

/**
 * Error display component
 */
const ErrorDisplay = ({ error, onRetry, children }) => {
  const safeMessage = typeof error === 'string'
    ? error
    : error?.message || 'An unknown error occurred';

  return (
    <div className="p-4">
      <div className="text-red-500 dark:text-red-400 p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
        {safeMessage}
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

ErrorDisplay.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string,
  }).isRequired,
  onRetry: PropTypes.func.isRequired,
  children: PropTypes.node,
};

/**
 * Loading skeleton component
 */
const NewsListSkeleton = ({ count = 6 }) => (
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, index) => (
      <Card key={`skeleton-${index}`} className="p-4 space-y-3 dark:bg-gray-800">
        <Skeleton className="h-32 w-full rounded-md bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-5 w-4/5 bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
        <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-gray-700" />
        </div>
      </Card>
    ))}
  </div>
);

NewsListSkeleton.propTypes = {
  count: PropTypes.number,
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * NewsList Component
 * 
 * @param {Object} props
 * @param {string} props.symbol - Stock symbol to fetch news for (default: "IBM")
 * @param {Array} props.newsData - Optional pre-fetched news data from parent
 * @param {boolean} props.loading - Optional loading state from parent
 * @returns {JSX.Element}
 */
const NewsList = ({
  symbol,
  newsData = null,
  loading: parentLoading = false,
}) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const displaySymbol = useMemo(() => symbol?.toUpperCase() || "IBM", [symbol]);

  /**
   * If parent supplies newsData, use it and skip fetching
   */
  useEffect(() => {
    if (Array.isArray(newsData)) {
      setNews(newsData);
      setLoading(false);
      setError(null);
    }
  }, [newsData]);

  /**
   * Fetches news from the API or uses sample data as fallback
   */
  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/news/get-news/', {
        params: { symbol: displaySymbol },
        timeout: 10000
      });
      
      const responseData = response.data || response;
      const newsArray = responseData?.news || responseData || [];
      const normalizedNews = Array.isArray(newsArray) ? newsArray : [];
      
      if (normalizedNews.length > 0) {
        setNews(normalizedNews);
        setError(null);
      } else {
        console.warn(`API returned empty news for ${displaySymbol}, using sample data.`);
        setNews(SAMPLE_NEWS);
        setError({
          message: "No news available - showing sample data",
          code: 404
        });
      }
    } catch (apiError) {
      console.warn(`API failed for ${displaySymbol}:`, apiError.message);
      setNews(SAMPLE_NEWS);
      setError({
        message: "Live data unavailable - showing sample data",
        code: apiError.code || 500
      });
    } finally {
      setLoading(false);
    }
  }, [displaySymbol]);

  /**
   * Fetch news when symbol changes or when parent data is not provided
   */
  useEffect(() => {
    if (Array.isArray(newsData)) {
      return;
    }
    fetchNews();
  }, [fetchNews, newsData]);

  const isLoading = parentLoading || loading;

  // ============================================================================
  // Render States
  // ============================================================================

  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Latest News for {displaySymbol}
        </h2>
        <NewsListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Latest News for {displaySymbol}
        </h2>
        <ErrorDisplay error={error} onRetry={fetchNews}>
          {news.length > 0 && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[80vh] overflow-y-auto pr-2">
              {news.map((item, index) => (
                <NewsItem key={`news-${index}-${item.id || item.url}`} item={item} />
              ))}
            </div>
          )}
        </ErrorDisplay>
      </div>
    );
  }

  if (!news.length) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Latest News for {displaySymbol}
        </h2>
        <div className="text-muted-foreground dark:text-gray-400 p-4 border rounded-lg text-center">
          No news articles found for this stock.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">
        Latest News for {displaySymbol}
      </h2>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[80vh] overflow-y-auto pr-2">
        {news.map((item, index) => (
          <NewsItem key={`news-${index}-${item.id || item.url}`} item={item} />
        ))}
      </div>
    </div>
  );
};

NewsList.propTypes = {
  symbol: PropTypes.string,
  newsData: PropTypes.array,
  loading: PropTypes.bool,
};

export default React.memo(NewsList);