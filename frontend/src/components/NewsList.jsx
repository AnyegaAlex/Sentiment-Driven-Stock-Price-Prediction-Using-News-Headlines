import React, { useEffect, useState, useMemo } from "react";
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

const NewsList = ({ symbol }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sentimentConfig = useMemo(() => ({
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
  }), []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/news/analyzed`, {
          params: { symbol },
          timeout: 10000
        });
        setNews(response.data || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching news:", err);
        setError(err.response?.data?.message || "Failed to load news. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [symbol]);

  const parseDate = useMemo(() => (dateString) => {
    if (!dateString) return "Date not available";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  }, []);

  const renderKeyPhrases = (phrases) => {
    if (!phrases?.length) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {phrases.slice(0, 3).map((phrase, i) => (
          <Badge 
            key={i} 
            variant="outline" 
            className="text-xs px-2 py-0.5 rounded-full"
          >
            {phrase}
          </Badge>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Latest News for {symbol?.toUpperCase() || "..."}</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-4 space-y-3">
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Latest News for {symbol?.toUpperCase() || "..."}</h2>
        <div className="text-red-500 dark:text-red-400 p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!news.length) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Latest News for {symbol?.toUpperCase() || "..."}</h2>
        <div className="text-muted-foreground p-4 border rounded-lg text-center">
          No news articles found for this stock.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Latest News for {symbol?.toUpperCase()}</h2>
      
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[80vh] overflow-y-auto pr-2">
        {news.map((item, index) => {
          const sentiment = item.sentiment?.toLowerCase() || 'neutral';
          const config = sentimentConfig[sentiment] || sentimentConfig.neutral;
          
          return (
            <Card key={`${item.url}-${index}`} className="flex flex-col h-full hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col space-y-3 p-4 h-full">
                {/* Title */}
                <h3 className="font-semibold text-base line-clamp-2">
                  {item.title || "No title available"}
                </h3>

                {/* Optional Image */}
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-40 object-cover rounded-md"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}

                {/* Summary */}
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.summary || "No summary available."}
                </p>

                {/* Metadata */}
                <div className="text-xs text-muted-foreground mt-auto flex justify-between items-center">
                  <span>{parseDate(item.date)}</span>
                  <span className="italic truncate max-w-[120px]">{item.source}</span>
                </div>

                {/* Sentiment & Confidence */}
                <div className="flex justify-between items-center">
                  <Badge className={cn(
                    "px-3 py-1 rounded-full text-xs capitalize",
                    config.badgeClass
                  )}>
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

                {/* Key Phrases */}
                {renderKeyPhrases(item.keyPhrases)}

                {/* Read Full Article */}
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
        })}
      </div>
    </div>
  );
};

NewsList.propTypes = {
  symbol: PropTypes.string.isRequired,
};

export default NewsList;