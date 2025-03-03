import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
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
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info, Loader2 } from "lucide-react";
import { FaExternalLinkAlt } from "react-icons/fa";
import { AiFillSmile, AiFillMeh, AiFillFrown } from "react-icons/ai";
import KeyPhraseChip from "@/components/KeyPhraseChip";

const NewsAnalysis = ({ symbol }) => {
  const [news, setNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [error, setError] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState(symbol);
  const [expandedPhrases, setExpandedPhrases] = useState({});

  const symbolList = ["IBM", "AAPL", "GOOG", "MSFT", "AMZN"];

  const sentimentIcons = {
    positive: <AiFillSmile className="w-5 h-5 text-green-600" />,
    neutral: <AiFillMeh className="w-5 h-5 text-yellow-600" />,
    negative: <AiFillFrown className="w-5 h-5 text-red-600" />,
  };

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/api/news/get-news/?symbol=${selectedSymbol}`
        );
        if (response.data?.news) {
          setNews(response.data.news);
          setFilteredNews(response.data.news);
        }
      } catch (err) {
        console.error("Error fetching news:", err);
        setError("Failed to fetch news. Please try again later.");
      }
    };
    fetchNews();
  }, [selectedSymbol]);

  useEffect(() => {
    const filtered =
      sentimentFilter === "all"
        ? news
        : news.filter((item) => item.sentiment === sentimentFilter);
    setFilteredNews(filtered);
  }, [news, sentimentFilter]);

  const toggleExpandPhrases = (index) => {
    setExpandedPhrases((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const renderKeyPhrases = (item, index) => {
    if (!item.key_phrases) return null;

    const phrases = Array.isArray(item.key_phrases)
      ? item.key_phrases
      : item.key_phrases.split(",").map((p) => p.trim()).filter(Boolean);

    const isExpanded = expandedPhrases[index];
    const visiblePhrases = isExpanded ? phrases : phrases.slice(0, 5);

    return (
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {visiblePhrases.map((phrase) => (
            <KeyPhraseChip
              key={phrase}
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
  };

  // Compute badge classes for sentiment or reliability
  const getBadgeClass = (type, value) => {
    if (type === "sentiment") {
      if (value === "positive") return "bg-green-100 text-green-800";
      if (value === "negative") return "bg-red-100 text-red-800";
      return "bg-yellow-100 text-yellow-800";
    } else if (type === "reliability") {
      if (value >= 80) return "bg-green-100 text-green-800";
      if (value >= 50) return "bg-yellow-100 text-yellow-800";
      return "bg-red-100 text-red-800";
    }
    return "";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">
        News Analysis for {selectedSymbol}
      </h1>

      {/* Filters */}
      <div className="mb-8 flex flex-col sm:flex-row justify-center gap-4">
        <Select
          value={selectedSymbol}
          onValueChange={setSelectedSymbol}
          aria-label="Select stock symbol"
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select Symbol" />
          </SelectTrigger>
          <SelectContent>
            {symbolList.map((sym) => (
              <SelectItem key={sym} value={sym}>
                {sym}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sentimentFilter}
          onValueChange={setSentimentFilter}
          aria-label="Filter by sentiment"
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiments</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {error ? (
        <Alert variant="destructive" className="mb-8">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : filteredNews.length === 0 ? (
        <Alert className="mb-8">
          <AlertTitle>No News Found</AlertTitle>
          <AlertDescription>
            Try adjusting filters or check back later.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNews.map((item, index) => (
            <Card key={`${item.url}-${index}`} className="h-full flex flex-col">
              {/* Image */}
              {item.banner_image_url ? (
                <img
                    src={item.banner_image_url}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                    loading="lazy"
                  />
                ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center rounded-t-lg">
                    <Loader2
                      className="w-8 h-8 animate-spin text-muted-foreground"
                      aria-label="Loading image"
                    />
                </div>
              )}

              {/* Card Content */}
              <CardContent className="p-4 flex flex-col gap-4 flex-1">
                {/* Title */}
                <CardTitle className="text-base font-semibold">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {item.title}
                      <FaExternalLinkAlt className="inline-block text-xs mt-0.5" />
                    </a>
                  ) : (
                    item.title
                  )}
                </CardTitle>

                {/* Summary */}
                <CardDescription className="text-sm line-clamp-3">
                  {item.summary || "No summary available"}
                </CardDescription>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Source</p>
                    <p className="font-medium">{item.source || "Unknown"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Published</p>
                    <p className="font-medium">
                      {new Date(item.published_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Reliability */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Reliability:</span>
                  <Badge className={getBadgeClass("reliability", item.source_reliability)}>
                    {item.source_reliability}%
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4} className="max-w-[200px]">
                      Source reliability score based on historical accuracy.
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Sentiment & Confidence */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sentiment:</span>
                    {sentimentIcons[item.sentiment] || sentimentIcons.neutral}
                    <Badge className={getBadgeClass("sentiment", item.sentiment)}>
                      {item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <div className="flex-1 relative h-2 rounded bg-gray-200">
                      <div
                        className="absolute top-0 left-0 h-full rounded bg-primary transition-all"
                        style={{ width: `${(item.confidence * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-xs w-12 text-right">
                      {Math.round(item.confidence * 100)}%
                    </span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4} className="max-w-[200px]">
                        Model confidence in sentiment analysis.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Key Phrases */}
                <div className="pt-2 border-t border-border">
                  <h4 className="text-sm font-medium mb-2">Key Phrases</h4>
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
  symbol: PropTypes.string,
};

NewsAnalysis.defaultProps = {
  symbol: "IBM",
};

export default NewsAnalysis;
