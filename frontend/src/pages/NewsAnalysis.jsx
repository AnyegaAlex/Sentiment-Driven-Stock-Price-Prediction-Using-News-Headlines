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
  positive: <AiFillSmile className="w-5 h-5 text-green-400" />,
  neutral: <AiFillMeh className="w-5 h-5 text-gray-400" />,
  negative: <AiFillFrown className="w-5 h-5 text-red-400" />,
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

  // Build symbol options – includes current selected symbol
  const symbolOptions = useMemo(() => {
    const options = availableSymbols.map(sym => ({
      value: typeof sym === 'string' ? sym : sym.symbol,
      label: typeof sym === 'string' ? sym : (sym.name || sym.symbol),
    }));
    
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
            className="text-gray-400 hover:text-white font-medium text-sm self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[44px] px-2"
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
    if (type === "sentiment") {
      if (value === "positive") return "bg-green-400/20 text-green-400";
      if (value === "negative") return "bg-red-400/20 text-red-400";
      return "bg-gray-700 text-gray-300";
    }
    if (type === "reliability") {
      if (value >= 80) return "bg-green-400/20 text-green-400";
      if (value >= 50) return "bg-gray-700 text-gray-300";
      return "bg-red-400/20 text-red-400";
    }
    return "";
  }, []);

  // Combined loading state
  const isLoading = symbolsLoading || newsLoading;
  const hasError = newsError || symbolsError;

  // Empty state
  const showEmptyState = !isLoading && !hasError && filteredNews.length === 0;

  return (
    <div className="container mx-auto px-4 py-8 bg-black text-white">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">
          News Analysis for {symbolDisplayName}
        </h1>
        {selectedSymbol && (
          <p className="text-sm text-gray-400 mt-1">
            FinBERT sentiment analysis on latest news for {symbolDisplayName}
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
          <SelectTrigger className="w-full sm:w-[220px] bg-gray-900 border-gray-800 text-white min-h-[44px]">
            <SelectValue placeholder={
              symbolsLoading ? "Loading symbols..." : 
              symbolOptions.length ? "Select Symbol" : "No symbols available"
            } />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800 text-white">
            {symbolOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="focus:bg-gray-800 focus:text-white text-gray-400 hover:text-white min-h-[44px]"
              >
                <span className="font-medium text-white">{option.value}</span>
                {option.label !== option.value && (
                  <span className="text-gray-500 ml-2">– {option.label}</span>
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
          <SelectTrigger className="w-full sm:w-[180px] bg-gray-900 border-gray-800 text-white min-h-[44px]">
            <SelectValue placeholder="Filter Sentiment" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800 text-white">
            {SENTIMENT_FILTERS.map((filter) => (
              <SelectItem 
                key={filter.value} 
                value={filter.value}
                className="focus:bg-gray-800 focus:text-white text-gray-400 hover:text-white min-h-[44px]"
              >
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filteredNews.length > 0 && (
          <Badge variant="outline" className="text-sm border-gray-700 text-gray-400">
            {filteredNews.length} article{filteredNews.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto" />
            <p className="mt-4 text-gray-400">
              {symbolsLoading ? 'Loading symbols...' : 'Loading news...'}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && !isLoading && (
        <Alert variant="destructive" className="mb-8 max-w-md mx-auto border-red-400 bg-gray-900 text-white">
          <AlertTitle className="flex items-center gap-2 text-white">
            <Info className="h-4 w-4 text-red-400" />
            Failed to Load News
          </AlertTitle>
          <AlertDescription className="mt-2 text-gray-300">
            {newsError?.message || symbolsError?.message || 'Unable to fetch news for this symbol. Please try again.'}
          </AlertDescription>
          <Button 
            variant="outline" 
            onClick={handleRetry}
            className="mt-3 border-white text-white hover:bg-white hover:text-black min-h-[44px]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </Alert>
      )}

      {/* Empty State */}
      {showEmptyState && (
        <div className="mb-8 max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <Newspaper className="h-8 w-8 text-gray-500 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-white mb-1">No News Found</h4>
          <p className="text-gray-400">
            {selectedSymbol 
              ? `No news articles found for ${symbolDisplayName}. Try adjusting your filters or check back later.`
              : 'Select a symbol to view news articles.'}
          </p>
        </div>
      )}

      {/* News Grid */}
      {!isLoading && !hasError && filteredNews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNews.map((item, index) => (
            <Card
              key={`${item.url}-${index}`}
              className="h-full flex flex-col transition-shadow hover:shadow-lg bg-gray-900 border border-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
                <div className="w-full h-48 bg-gray-800 flex items-center justify-center rounded-t-lg">
                  <Newspaper className="w-12 h-12 text-gray-600" />
                </div>
              )}

              <CardContent className="p-4 flex flex-col gap-4 flex-1">
                <CardTitle className="text-base font-semibold text-white line-clamp-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-300 inline-flex items-start gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    {item.title || 'Untitled Article'}
                    <ExternalLink className="inline-block w-3 h-3 mt-0.5 flex-shrink-0" />
                  </a>
                </CardTitle>

                <CardDescription className="text-sm text-gray-400 line-clamp-3">
                  {truncateText(item.summary, 150)}
                </CardDescription>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-gray-500">Source</p>
                    <p className="font-medium text-gray-300 truncate">
                      {item.source || "Unknown"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-gray-500">Published</p>
                    <p className="font-medium text-gray-300">
                      {formatDate(item.published_at)}
                    </p>
                  </div>
                </div>

                {item.source_reliability !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Reliability:</span>
                    <Badge className={getBadgeClass("reliability", item.source_reliability)}>
                      {item.source_reliability}%
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-gray-500 cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4} className="max-w-[200px] bg-gray-900 border border-gray-800 text-white">
                        Source reliability score based on historical accuracy.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Sentiment:</span>
                    {SENTIMENT_ICONS[item.sentiment] || SENTIMENT_ICONS.neutral}
                    <Badge className={getBadgeClass("sentiment", item.sentiment)}>
                      {item.sentiment?.charAt(0)?.toUpperCase() + item.sentiment?.slice(1) || "Unknown"}
                    </Badge>
                  </div>

                  {item.confidence !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Confidence:</span>
                      <div className="flex-1 relative h-2 rounded bg-gray-800">
                        <div
                          className="absolute top-0 left-0 h-full rounded bg-green-400 transition-all"
                          style={{ width: `${Math.min(100, Math.round(item.confidence * 100))}%` }}
                        />
                      </div>
                      <span className="text-xs w-12 text-right text-gray-400">
                        {Math.round(item.confidence * 100)}%
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-gray-500 cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={4} className="max-w-[200px] bg-gray-900 border border-gray-800 text-white">
                          LSTM model confidence in sentiment analysis.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-800">
                  <h4 className="text-sm font-medium mb-2 text-gray-300">Key Phrases</h4>
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