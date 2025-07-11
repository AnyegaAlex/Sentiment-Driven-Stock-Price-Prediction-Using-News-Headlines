import React, { useEffect, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Info, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchMockNews } from "@/services/mockNewsData";

// Sentiment configuration (memoized outside component)
const sentimentConfig = {
  positive: { 
    icon: "📈", 
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
    progressClass: "bg-green-500"
  },
  neutral: { 
    icon: "➖", 
    badgeClass: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    progressClass: "bg-gray-500"
  },
  negative: { 
    icon: "📉", 
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    progressClass: "bg-red-500"
  }
};

/**
 * Individual news item component (memoized for performance)
 */
const NewsItem = React.memo(function NewsItem({ item }) {
  const sentiment = item.sentiment?.toLowerCase() || 'neutral';
  const config = sentimentConfig[sentiment] || sentimentConfig.neutral;
  
  const parseDate = useCallback((dateString) => {
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
  }, []);

  const renderKeyPhrases = useCallback((phrases) => {
    if (!phrases?.length) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {phrases.slice(0, 3).map((phrase, i) => (
          <Badge 
            key={`phrase-${i}`} 
            variant="outline" 
            className="text-xs px-2 py-0.5 rounded-full"
          >
            {phrase}
          </Badge>
        ))}
      </div>
    );
  }, []);

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardContent className="flex flex-col space-y-3 p-4 h-full">
        <h3 className="font-semibold text-base line-clamp-2">
          {item.title || "No title available"}
        </h3>

        {item.image ? (
          <div className="relative pt-[50%]">
            <img
              src={item.image}
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

        <p className="text-sm text-muted-foreground line-clamp-3">
          {item.summary || "No summary available."}
        </p>

        <div className="text-xs text-muted-foreground mt-auto flex justify-between items-center">
          <span>{parseDate(item.date)}</span>
          <span className="italic truncate max-w-[120px]">{item.source}</span>
        </div>

        <div className="flex justify-between items-center">
          <Badge className={cn("px-3 py-1 rounded-full text-xs capitalize", config.badgeClass)}>
            {config.icon} {sentiment}
          </Badge>

          {item.confidence && (
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <Info className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">Confidence: {item.confidence.toFixed(0)}%</span>
              </TooltipTrigger>
              <TooltipContent className="w-40">
                <Progress 
                  value={item.confidence} 
                  className={config.progressClass}
                />
                <div className="text-center text-xs mt-1">Analysis Confidence</div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {renderKeyPhrases(item.keyPhrases)}

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

// 💀 Error display with normalization
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

/**
 * Main NewsList component
 */
const NewsList = ({ symbol = 'IBM' }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const displaySymbol = useMemo(() => symbol?.toUpperCase() || "IBM", [symbol]);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Always use mock data in production or when explicitly set
      if (import.meta.env.PROD || import.meta.env.VITE_USE_MOCK_DATA === "true") {
        const mockData = await fetchMockNews(displaySymbol);
        setNews(mockData);
        return;
      }

      // Try real API only in development and when not using mock data
      try {
        const response = await axios.get(`/api/news/analyzed`, {
          params: { symbol: displaySymbol },
          timeout: 3000
        });
        setNews(response.data);
      } catch (apiError) {
        console.log("API request failed, falling back to mock data");
        const mockData = await fetchMockNews(displaySymbol);
        setNews(mockData);
       setError({
          message: "Live data unavailable - showing mock data",
          code: apiError.response?.status || 500
        });
      }
    } catch (err) {
      console.error("News fetch failed:", err);
      setError({
        message: err?.message || 'Unexpected error loading news',
        code: err?.response?.status || 500
      });
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, [displaySymbol]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  if (loading) {
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
  symbol: PropTypes.string
};

NewsList.defaultProps = {
  symbol: 'IBM'
};

NewsListSkeleton.propTypes = {
  count: PropTypes.number
};

NewsListSkeleton.defaultProps = {
  count: 6
};

ErrorDisplay.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string
  }).isRequired,
  onRetry: PropTypes.func.isRequired,
  children: PropTypes.node
};

NewsItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    summary: PropTypes.string,
    source: PropTypes.string,
    date: PropTypes.string,
    url: PropTypes.string,
    sentiment: PropTypes.string,
    confidence: PropTypes.number,
    keyPhrases: PropTypes.arrayOf(PropTypes.string),
    image: PropTypes.string,
    symbol: PropTypes.string
  }).isRequired
};
export default React.memo(NewsList);