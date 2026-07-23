import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Info, Loader2, ExternalLink, Newspaper, RefreshCw } from "lucide-react";
import { AiFillSmile, AiFillMeh, AiFillFrown } from "react-icons/ai";
import KeyPhraseChip from "@/components/KeyPhraseChip";
import { useSymbolsQuery } from "@/hooks/queries/useSymbolsQuery";
import { useNewsQuery } from "@/hooks/queries/useNewsQuery";
import { useDashboard } from "@/context/DashboardContext";
import { cn } from "@/lib/utils";

// Constants
const SENTIMENT_FILTERS = [
  { value: 'all', label: 'All Sentiments' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
];

const SENTIMENT_ICONS = {
  positive: <AiFillSmile className="w-5 h-5 text-green-600 dark:text-green-400" />,
  neutral: <AiFillMeh className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
  negative: <AiFillFrown className="w-5 h-5 text-red-600 dark:text-red-400" />,
};

const PLACEHOLDER_IMAGE = "/placeholder-news.jpg";

// Helper: Format date
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: diffDays > 365 ? 'numeric' : undefined,
  });
};

// Helper: Truncate text
const truncateText = (text, maxLength = 150) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

const NewsAnalysis = () => {
  const { stockSymbol, setStockSymbol } = useDashboard();

  // Local state
  const [selectedSymbol, setSelectedSymbol] = useState(stockSymbol || "");
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [expandedPhrases, setExpandedPhrases] = useState({});

  // Queries
  const { 
    data: availableSymbols = [], 
    isLoading: symbolsLoading,
    error: symbolsError,
    refetch: refetchSymbols,
  } = useSymbolsQuery();

  const { 
    data: news = [], 
    isLoading: newsLoading, 
    error: newsError,
    refetch: refetchNews,
  } = useNewsQuery(selectedSymbol, {
    enabled: !!selectedSymbol,
  });

  // ✅ Build symbol options – includes current selected symbol
  const symbolOptions = useMemo(() => {
    const options = availableSymbols.map(sym => ({
      value: typeof sym === 'string' ? sym : sym.symbol,
      label: typeof sym === 'string' ? sym : (sym.name || sym.symbol),
    }));
    
    // ✅ If selectedSymbol is not in options, add it
    if (selectedSymbol && !options.some(opt => opt.value === selectedSymbol)) {
      options.unshift({
        value: selectedSymbol,
        label: selectedSymbol,
      });
    }
    
    return options;
  }, [availableSymbols, selectedSymbol]);

  // Find symbol name
  const getSymbolName = useCallback((symbol) => {
    if (!symbol) return "Stocks";
    const found = symbolOptions.find(s => s.value === symbol);
    return found?.label || symbol;
  }, [symbolOptions]);

  // Get symbol display name
  const symbolDisplayName = useMemo(() => {
    return getSymbolName(selectedSymbol);
  }, [selectedSymbol, getSymbolName]);

  // Sync with global symbol
  useEffect(() => {
    if (stockSymbol) {
      setSelectedSymbol(stockSymbol);
    }
  }, [stockSymbol]);

  // Handle symbol change
  const handleSymbolChange = useCallback((symbol) => {
    setSelectedSymbol(symbol);
    if (symbol) {
      setStockSymbol(symbol);
    }
  }, [setStockSymbol]);

  // Handle retry
  const handleRetry = useCallback(() => {
    if (newsError) {
      refetchNews();
    }
    if (symbolsError) {
      refetchSymbols();
    }
  }, [newsError, symbolsError, refetchNews, refetchSymbols]);

  // Filter news
  const filteredNews = useMemo(() => {
    if (sentimentFilter === "all") return news;
    return news.filter(item => item.sentiment === sentimentFilter);
  }, [news, sentimentFilter]);

  // Toggle key phrases
  const toggleExpandPhrases = useCallback((index) => {
    setExpandedPhrases(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  // Render key phrases
  const renderKeyPhrases = useCallback((item, index) => {
    if (!item.key_phrases) return null;

    const phrases = Array.isArray(item.key_phrases)
      ? item.key_phrases
      : item.key_phrases.split(",").map(p => p.trim()).filter(Boolean);

    if (phrases.length === 0) return null;

    const isExpanded = expandedPhrases[index];
    const visiblePhrases = isExpanded ? phrases : phrases.slice(0, 5);

    return (
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {visiblePhrases.map((phrase) => (
            <KeyPhraseChip
              key={`${phrase}-${index}`}
              phrase={phrase}
              onClick={() => {
                if (window.gtag) {
                  window.gtag('event', 'phrase_click', { phrase });
                }
              }}
            />
          ))}
        </div>
        {phrases.length > 5 && (
          <button
            className="text-primary hover:underline font-medium text-sm self-start"
            onClick={() => toggleExpandPhrases(index)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? "Show Less" : `Show More (${phrases.length - 5})`}
          </button>
        )}
      </div>
    );
  }, [expandedPhrases, toggleExpandPhrases]);

  // Get badge class
  const getBadgeClass = useCallback((type, value) => {
    const base = "dark:bg-opacity-20 dark:text-opacity-90";
    if (type === "sentiment") {
      if (value === "positive") return `${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      if (value === "negative") return `${base} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
    }
    if (type === "reliability") {
      if (value >= 80) return `${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      if (value >= 50) return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      return `${base} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
    }
    return "";
  }, []);

  // Combined loading state
  const isLoading = symbolsLoading || newsLoading;
  const hasError = newsError || symbolsError;

  // Empty state
  const showEmptyState = !isLoading && !hasError && filteredNews.length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          News Analysis for {symbolDisplayName}
        </h1>
        {selectedSymbol && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Latest news and sentiment for {symbolDisplayName}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col sm:flex-row justify-center items-center gap-4">
        <Select
          value={selectedSymbol}
          onValueChange={handleSymbolChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full sm:w-[220px] dark:bg-gray-800 dark:border-gray-700">
            <SelectValue placeholder={
              symbolsLoading ? "Loading symbols..." : 
              symbolOptions.length ? "Select Symbol" : "No symbols available"
            } />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700 max-h-60">
            {symbolOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="dark:hover:bg-gray-700"
              >
                <span className="font-medium">{option.value}</span>
                {option.label !== option.value && (
                  <span className="text-gray-400 ml-2">– {option.label}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sentimentFilter}
          onValueChange={setSentimentFilter}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full sm:w-[180px] dark:bg-gray-800 dark:border-gray-700">
            <SelectValue placeholder="Filter Sentiment" />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            {SENTIMENT_FILTERS.map((filter) => (
              <SelectItem 
                key={filter.value} 
                value={filter.value}
                className="dark:hover:bg-gray-700"
              >
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filteredNews.length > 0 && (
          <Badge variant="outline" className="text-sm">
            {filteredNews.length} article{filteredNews.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {symbolsLoading ? 'Loading symbols...' : 'Loading news...'}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && !isLoading && (
        <Alert variant="destructive" className="mb-8 max-w-md mx-auto">
          <AlertTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Error Loading News
          </AlertTitle>
          <AlertDescription className="mt-2">
            {newsError?.message || symbolsError?.message || 'Failed to fetch news. Please try again.'}
          </AlertDescription>
          <Button 
            variant="outline" 
            onClick={handleRetry}
            className="mt-3"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </Alert>
      )}

      {/* Empty State */}
      {showEmptyState && (
        <Alert className="mb-8 max-w-md mx-auto dark:bg-gray-800 dark:border-gray-700">
          <Newspaper className="h-5 w-5 text-gray-400 mx-auto mb-2" />
          <AlertTitle className="text-center">No News Found</AlertTitle>
          <AlertDescription className="text-center dark:text-gray-400">
            {selectedSymbol 
              ? `No news articles found for ${symbolDisplayName}. Try adjusting your filters or check back later.`
              : 'Select a symbol to view news articles.'}
          </AlertDescription>
        </Alert>
      )}

      {/* News Grid */}
      {!isLoading && !hasError && filteredNews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNews.map((item, index) => (
            <Card
              key={`${item.url}-${index}`}
              className="h-full flex flex-col transition-shadow hover:shadow-lg dark:bg-gray-800 dark:border-gray-700"
            >
              {/* Image */}
              {item.banner_image_url ? (
                <img
                  src={item.banner_image_url}
                  alt={item.title || 'News article image'}
                  className="w-full h-48 object-cover rounded-t-lg"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = PLACEHOLDER_IMAGE;
                  }}
                />
              ) : (
                <div className="w-full h-48 bg-muted dark:bg-gray-700 flex items-center justify-center rounded-t-lg">
                  <Newspaper className="w-12 h-12 text-muted-foreground dark:text-gray-500" />
                </div>
              )}

              <CardContent className="p-4 flex flex-col gap-4 flex-1">
                <CardTitle className="text-base font-semibold dark:text-white line-clamp-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline inline-flex items-start gap-1"
                  >
                    {item.title || 'Untitled Article'}
                    <ExternalLink className="inline-block w-3 h-3 mt-0.5 flex-shrink-0" />
                  </a>
                </CardTitle>

                <CardDescription className="text-sm line-clamp-3 dark:text-gray-400">
                  {truncateText(item.summary, 150)}
                </CardDescription>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground dark:text-gray-500">Source</p>
                    <p className="font-medium dark:text-gray-300 truncate">
                      {item.source || "Unknown"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground dark:text-gray-500">Published</p>
                    <p className="font-medium dark:text-gray-300">
                      {formatDate(item.published_at)}
                    </p>
                  </div>
                </div>

                {item.source_reliability !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground dark:text-gray-500">Reliability:</span>
                    <Badge className={getBadgeClass("reliability", item.source_reliability)}>
                      {item.source_reliability}%
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4} className="max-w-[200px] dark:bg-gray-900">
                        Source reliability score based on historical accuracy.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground dark:text-gray-500">Sentiment:</span>
                    {SENTIMENT_ICONS[item.sentiment] || SENTIMENT_ICONS.neutral}
                    <Badge className={getBadgeClass("sentiment", item.sentiment)}>
                      {item.sentiment?.charAt(0)?.toUpperCase() + item.sentiment?.slice(1) || "Unknown"}
                    </Badge>
                  </div>

                  {item.confidence !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground dark:text-gray-500">Confidence:</span>
                      <div className="flex-1 relative h-2 rounded bg-gray-200 dark:bg-gray-700">
                        <div
                          className="absolute top-0 left-0 h-full rounded bg-primary transition-all"
                          style={{ width: `${Math.min(100, Math.round(item.confidence * 100))}%` }}
                        />
                      </div>
                      <span className="text-xs w-12 text-right dark:text-gray-400">
                        {Math.round(item.confidence * 100)}%
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={4} className="max-w-[200px] dark:bg-gray-900">
                          Model confidence in sentiment analysis.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border dark:border-gray-700">
                  <h4 className="text-sm font-medium mb-2 dark:text-gray-300">Key Phrases</h4>
                  {renderKeyPhrases(item, index)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(NewsAnalysis);