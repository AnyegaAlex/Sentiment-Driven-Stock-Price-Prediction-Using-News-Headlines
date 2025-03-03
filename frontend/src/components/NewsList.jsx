import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { FaExternalLinkAlt } from "react-icons/fa";
import { AiFillSmile, AiFillMeh, AiFillFrown } from "react-icons/ai";
import KeyPhraseChip from "@/components/KeyPhraseChip";

const NewsList = ({ news }) => {
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [expandedPhrases, setExpandedPhrases] = useState({});

  const sentimentIcons = {
    positive: <AiFillSmile className="w-5 h-5 text-green-600" aria-hidden="true" />,
    neutral: <AiFillMeh className="w-5 h-5 text-yellow-600" aria-hidden="true" />,
    negative: <AiFillFrown className="w-5 h-5 text-red-600" aria-hidden="true" />,
  };

  // Filter news based on sentiment
  const filteredNews = sentimentFilter === "all"
    ? news
    : news.filter((item) => item.sentiment === sentimentFilter);

  // Toggle expanded key phrases
  const toggleExpandPhrases = (index) => {
    setExpandedPhrases((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Render key phrases with "Show More" functionality
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
              aria-label={`Key phrase: ${phrase}`}
            />
          ))}
        </div>
        {phrases.length > 5 && (
          <button
            className="text-primary hover:underline font-medium text-sm self-start"
            onClick={() => toggleExpandPhrases(index)}
            aria-expanded={isExpanded}
            aria-controls={`key-phrases-${index}`}
          >
            {isExpanded ? "Show Less" : "Show More..."}
          </button>
        )}
      </div>
    );
  };

  // Get badge classes for sentiment or reliability
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

  // Parse date safely
  const parseDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid Date";
    }
  };

  if (!news || news.length === 0) {
    return <p className="text-center text-gray-500">No news available.</p>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Sentiment Filter */}
      <div className="mb-8 flex justify-center">
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

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredNews.map((item, index) => (
          <Card key={`${item.url}-${index}`} className="h-full flex flex-col">
            {/* Banner Image */}
            {item.banner_image_url ? (
              <img
                src={item.banner_image_url}
                alt={item.title}
                className="w-full h-48 object-cover rounded-t-lg"
                loading="lazy"
                onError={(e) => {
                  e.target.src = "/fallback-image.jpg";
                  e.target.alt = "Image unavailable";
                }}
              />
            ) : (
              <div className="w-full h-48 bg-muted flex items-center justify-center rounded-t-lg">
                <div className="text-muted-foreground">No Image</div>
              </div>
            )}

            {/* Card Content */}
            <CardContent className="p-4 flex flex-col gap-4 flex-1">
              {/* Title */}
              <CardTitle className="text-base font-semibold">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                  aria-label={`Read full article: ${item.title}`}
                >
                  {item.title}
                  <FaExternalLinkAlt className="inline-block text-xs mt-0.5" aria-hidden="true" />
                </a>
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
                    {parseDate(item.published_at)}
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
                    <Info className="w-4 h-4 text-muted-foreground cursor-pointer" aria-label="Reliability info" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
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
                  <Progress value={(item.confidence || 0) * 100} className="flex-1 h-2" />
                  <span className="text-xs w-12 text-right">
                    {Math.round((item.confidence || 0) * 100)}%
                  </span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground cursor-pointer" aria-label="Confidence info" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      Model confidence in sentiment classification.
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
    </div>
  );
};

NewsList.propTypes = {
  news: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      summary: PropTypes.string.isRequired,
      source: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired,
      published_at: PropTypes.string.isRequired,
      sentiment: PropTypes.string.isRequired,
      confidence: PropTypes.number.isRequired,
      key_phrases: PropTypes.string.isRequired,
      source_reliability: PropTypes.number.isRequired,
      banner_image_url: PropTypes.string,
    })
  ).isRequired,
};

export default NewsList;