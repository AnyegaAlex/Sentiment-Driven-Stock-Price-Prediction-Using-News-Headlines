import React, { useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
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
import { Info, Loader2, ExternalLink, Newspaper } from "lucide-react";
import { AiFillSmile, AiFillMeh, AiFillFrown } from "react-icons/ai";
import KeyPhraseChip from "@/components/KeyPhraseChip";
import { useSymbolsQuery } from "@/hooks/queries/useSymbolsQuery";
import { useNewsQuery } from "@/hooks/queries/useNewsQuery";
import { useDashboard } from "@/context/DashboardContext";

const NewsAnalysis = () => {
  const { stockSymbol, setStockSymbol } = useDashboard();

  // Local state: start from global symbol, allow dropdown to change
  const [selectedSymbol, setSelectedSymbol] = useState(stockSymbol || "");
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [expandedPhrases, setExpandedPhrases] = useState({});

  // Sync with global symbol when it changes
  useEffect(() => {
    if (stockSymbol) {
      setSelectedSymbol(stockSymbol);
    }
  }, [stockSymbol]);

  // When user changes dropdown, update global context
  const handleSymbolChange = (symbol) => {
    setSelectedSymbol(symbol);
    if (symbol) {
      setStockSymbol(symbol);
    }
  };

  // React Query – symbols and news
  const { data: availableSymbols = [], isLoading: symbolsLoading } = useSymbolsQuery();
  const { data: news = [], isLoading: newsLoading, error: newsError } = useNewsQuery(selectedSymbol);

  const filteredNews = sentimentFilter === "all"
    ? news
    : news.filter(item => item.sentiment === sentimentFilter);

  const sentimentIcons = {
    positive: <AiFillSmile className="w-5 h-5 text-green-600 dark:text-green-400" />,
    neutral: <AiFillMeh className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
    negative: <AiFillFrown className="w-5 h-5 text-red-600 dark:text-red-400" />,
  };

  const toggleExpandPhrases = useCallback((index) => {
    setExpandedPhrases(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const renderKeyPhrases = useCallback((item, index) => {
    if (!item.key_phrases) return null;

    const phrases = Array.isArray(item.key_phrases)
      ? item.key_phrases
      : item.key_phrases.split(",").map(p => p.trim()).filter(Boolean);

    const isExpanded = expandedPhrases[index];
    const visiblePhrases = isExpanded ? phrases : phrases.slice(0, 5);

    return (
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {visiblePhrases.map(phrase => (
            <KeyPhraseChip
              key={`${phrase}-${index}`}
              phrase={phrase}
              onClick={() => console.log("Clicked phrase:", phrase)}
            />
          ))}
        </div>
        {phrases.length > 5 && (
          <button
            className="text-primary hover:underline font-medium text-sm self-start"
            onClick={() => toggleExpandPhrases(index)}
          >
            {isExpanded ? "Show Less" : "Show More..."}
          </button>
        )}
      </div>
    );
  }, [expandedPhrases, toggleExpandPhrases]);

  const getBadgeClass = useCallback((type, value) => {
    const base = "dark:bg-opacity-20 dark:text-opacity-90";
    if (type === "sentiment") {
      if (value === "positive") return `${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      if (value === "negative") return `${base} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
    } else if (type === "reliability") {
      if (value >= 80) return `${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      if (value >= 50) return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      return `${base} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
    }
    return "";
  }, []);

  const isLoading = symbolsLoading || newsLoading;
  const error = newsError;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center dark:text-white">
        News Analysis for {selectedSymbol || "Stocks"}
      </h1>

      {/* Filters */}
      <div className="mb-8 flex flex-col sm:flex-row justify-center gap-4">
        <Select
          value={selectedSymbol}
          onValueChange={handleSymbolChange}
          disabled={isLoading || availableSymbols.length === 0}
        >
          <SelectTrigger className="w-full sm:w-[200px] dark:bg-gray-800 dark:border-gray-700">
            <SelectValue placeholder={availableSymbols.length ? "Select Symbol" : "Loading symbols..."} />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            {availableSymbols.map((sym) => {
              // sym is an object { symbol, name, region }
              const symbolValue = sym.symbol;
              const displayName = sym.name || symbolValue;
              return (
                <SelectItem
                  key={symbolValue}
                  value={symbolValue}
                  className="dark:hover:bg-gray-700"
                >
                  {symbolValue} – {displayName}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select
          value={sentimentFilter}
          onValueChange={setSentimentFilter}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full sm:w-[200px] dark:bg-gray-800 dark:border-gray-700">
            <SelectValue placeholder="Filter Sentiment" />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            <SelectItem value="all" className="dark:hover:bg-gray-700">All Sentiments</SelectItem>
            <SelectItem value="positive" className="dark:hover:bg-gray-700">Positive</SelectItem>
            <SelectItem value="neutral" className="dark:hover:bg-gray-700">Neutral</SelectItem>
            <SelectItem value="negative" className="dark:hover:bg-gray-700">Negative</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mb-8">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message || "Failed to fetch news."}</AlertDescription>
        </Alert>
      ) : filteredNews.length === 0 ? (
        <Alert className="mb-8 dark:bg-gray-800 dark:border-gray-700">
          <AlertTitle>No News Found</AlertTitle>
          <AlertDescription className="dark:text-gray-400">
            Try adjusting filters or check back later.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNews.map((item, index) => (
            <Card
              key={`${item.url}-${index}`}
              className="h-full flex flex-col dark:bg-gray-800 dark:border-gray-700"
            >
              {/* Image */}
              {item.banner_image_url ? (
                <img
                  src={item.banner_image_url}
                  alt={item.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/placeholder-news.jpg";
                  }}
                />
              ) : (
                <div className="w-full h-48 bg-muted dark:bg-gray-700 flex items-center justify-center rounded-t-lg">
                  <Newspaper className="w-12 h-12 text-muted-foreground" />
                </div>
              )}

              {/* Card Content */}
              <CardContent className="p-4 flex flex-col gap-4 flex-1">
                {/* Title */}
                <CardTitle className="text-base font-semibold dark:text-white">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {item.title}
                    <ExternalLink className="inline-block w-3 h-3 ml-1" />
                  </a>
                </CardTitle>

                {/* Summary */}
                <CardDescription className="text-sm line-clamp-3 dark:text-gray-400">
                  {item.summary || "No summary available"}
                </CardDescription>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground dark:text-gray-500">Source</p>
                    <p className="font-medium dark:text-gray-300">{item.source || "Unknown"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground dark:text-gray-500">Published</p>
                    <p className="font-medium dark:text-gray-300">
                      {new Date(item.published_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Reliability */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground dark:text-gray-500">Reliability:</span>
                  <Badge className={getBadgeClass("reliability", item.source_reliability)}>
                    {item.source_reliability}%
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4} className="max-w-[200px] dark:bg-gray-900">
                      Source reliability score based on historical accuracy.
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Sentiment & Confidence */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground dark:text-gray-500">Sentiment:</span>
                    {sentimentIcons[item.sentiment] || sentimentIcons.neutral}
                    <Badge className={getBadgeClass("sentiment", item.sentiment)}>
                      {item.sentiment?.charAt(0)?.toUpperCase() + item.sentiment?.slice(1) || "Unknown"}
                    </Badge>
                  </div>

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
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4} className="max-w-[200px] dark:bg-gray-900">
                        Model confidence in sentiment analysis.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Key Phrases */}
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

NewsAnalysis.propTypes = {
  // no symbol prop needed – it uses global context
};

export default NewsAnalysis;