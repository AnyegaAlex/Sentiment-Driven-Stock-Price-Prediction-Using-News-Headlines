/**
 * NewsList Component
 * 
 * Displays a grid of news articles with sentiment analysis for a given stock symbol.
 * Features:
 * - Sentiment badges (positive, neutral, negative) with icons
 * - Confidence score display with progress bars
 * - Key phrases extraction and display
 * - Responsive grid layout (1, 2, or 3 columns based on screen size)
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
import { Info, ExternalLink } from "lucide-react";
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
  
  // Already an array
  if (Array.isArray(phrases)) {
    return phrases.filter(p => p && p.trim());
  }
  
  // Comma-separated string
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

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardContent className="flex flex-col space-y-3 p-4 h-full">
        {/* Title */}
        <h3 className="font-semibold text-base line-clamp-2">
          {item.title || "No title available"}
        </h3>

        {/* Image */}
        {item.banner_image_url || item.image ? (
          <div className="relative pt-[50%]">
            <img
              src={item.banner_image_url || item.image}
              alt={item.title || "News image"}
              className="absolute top-0 left-0 w-full h-full object-cover rounded-md mb-3"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.classList.add('!pt-0');
              }}
            />
          </div>
        ) : (
          <div className="w-full h-0 pt-[50%] bg-muted rounded-md mb-3 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No image available</span>
          </div>
        )}

        {/* Summary */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {item.summary || "No summary available."}
        </p>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground mt-auto flex justify-between items-center">
          <span>{parseDate(item.published_at || item.date)}</span>
          <span className="italic truncate max-w-[120px]">{item.source || item.source_name}</span>
        </div>

        {/* Sentiment Badge + Confidence */}
        <div className="flex justify-between items-center">
          <Badge className={cn("px-3 py-1 rounded-full text-xs capitalize", config.badgeClass)}>
            {config.icon} {sentiment}
          </Badge>

          {item.confidence !== undefined && item.confidence !== null && (
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <Info className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">Confidence: {(item.confidence * 100).toFixed(0)}%</span>
              </TooltipTrigger>
              <TooltipContent className="w-40">
                <Progress 
                  value={item.confidence * 100} 
                  indicatorClassName={config.progressClass} 
                />
                <div className="text-center text-xs mt-1">Analysis Confidence</div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Key Phrases - NOW HANDLES BOTH STRING AND ARRAY */}
        {keyPhrases.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {keyPhrases.slice(0, 3).map((phrase, index) => (
              <Badge
                key={`phrase-${index}`}
                variant="outline"
                className="text-xs px-2 py-0.5 rounded-full"
              >
                {phrase}
              </Badge>
            ))}
          </div>
        )}

        {/* Read More Link */}
        {item.url && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full mt-2 text-xs gap-1"
          >
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Read full article: ${item.title}`}
            >
              <ExternalLink className="h-3 w-3" />
              Read Full Article
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

NewsItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // ✅ Allow both types
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
      <Card key={`skeleton-${index}`} className="p-4 space-y-3">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
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
  symbol = "IBM",
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
      // Try real API
      const response = await apiClient.get('/news/get-news/', {
        params: { symbol: displaySymbol },
        timeout: 10000
      });
      
      // apiClient returns response.data directly
      const responseData = response.data || response;
      const newsArray = responseData?.news || responseData || [];
      const normalizedNews = Array.isArray(newsArray) ? newsArray : [];
      
      if (normalizedNews.length > 0) {
        setNews(normalizedNews);
        setError(null);
      } else {
        // API returned empty array, use sample data
        console.warn(`API returned empty news for ${displaySymbol}, using sample data.`);
        setNews(SAMPLE_NEWS);
        setError({
          message: "No news available - showing sample data",
          code: 404
        });
      }
    } catch (apiError) {
      // API failed, use sample data as fallback
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
      return; // Parent-controlled
    }
    fetchNews();
  }, [fetchNews, newsData]);

  /**
   * Determine loading state from parent or local
   */
  const isLoading = parentLoading || loading;

  // ============================================================================
  // Render States
  // ============================================================================

  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Latest News for {displaySymbol}</h2>
        <NewsListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Latest News for {displaySymbol}</h2>
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
        <h2 className="text-xl font-semibold mb-4">Latest News for {displaySymbol}</h2>
        <div className="text-muted-foreground p-4 border rounded-lg text-center">
          No news articles found for this stock.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Latest News for {displaySymbol}</h2>
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