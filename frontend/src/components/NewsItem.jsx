/**
 * NewsItem – Individual news article card with sentiment, confidence, and key phrases
 *
 * Features:
 * - Memoized for performance
 * - Dark mode only (brand compliant)
 * - Accessibility (ARIA labels)
 * - Sentiment badges with icons
 * - Confidence progress bar
 * - Reliability score with percentage
 * - Key phrases with truncation
 *
 * @component
 */

import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, ExternalLink, Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

const SENTIMENT_CONFIG = {
  positive: {
    badgeClass: 'bg-green-400/20 text-green-400 border-green-400/30',
    icon: TrendingUp,
    label: 'Positive',
  },
  neutral: {
    badgeClass: 'bg-gray-700/50 text-gray-400 border-gray-700/50',
    icon: Minus,
    label: 'Neutral',
  },
  negative: {
    badgeClass: 'bg-red-400/20 text-red-400 border-red-400/30',
    icon: TrendingDown,
    label: 'Negative',
  },
};

const RELIABILITY_CONFIG = {
  high: { badge: 'bg-green-400/20 text-green-400', label: 'High' },
  medium: { badge: 'bg-gray-700/50 text-gray-400', label: 'Medium' },
  low: { badge: 'bg-red-400/20 text-red-400', label: 'Low' },
};

// ============================================================================
// Helper Functions
// ============================================================================

const normalizeKeyPhrases = (phrases) => {
  if (!phrases) return [];
  if (Array.isArray(phrases)) return phrases.filter(Boolean);
  if (typeof phrases === 'string') return phrases.split(/,\s*/).filter(Boolean);
  return [];
};

const getReliabilityLevel = (score) => {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

const parseDate = (dateString) => {
  if (!dateString) return 'Date not available';
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

// ============================================================================
// Main Component
// ============================================================================

const NewsItem = React.memo(function NewsItem({ item }) {
  const sentiment = item.sentiment?.toLowerCase() || 'neutral';
  const config = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.neutral;
  const SentimentIcon = config.icon;

  const keyPhrases = useMemo(() => normalizeKeyPhrases(item.key_phrases || item.keyPhrases), [item.key_phrases, item.keyPhrases]);
  const reliabilityScore = item.source_reliability || 0;
  const reliabilityLevel = getReliabilityLevel(reliabilityScore);
  const reliabilityConfig = RELIABILITY_CONFIG[reliabilityLevel];
  const confidencePercent = Math.round((item.confidence || 0) * 100);
  const hasImage = !!(item.banner_image_url || item.image);

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md border border-gray-800 bg-gray-900">
      <CardContent className="flex flex-1 flex-col space-y-3 p-4">
        {/* Image */}
        <div className="relative overflow-hidden rounded-md">
          {hasImage ? (
            <img
              src={item.banner_image_url || item.image}
              alt={item.title || 'News image'}
              className="h-40 w-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.style.display = 'none';
                const parent = e.target.parentNode;
                if (parent) {
                  parent.innerHTML = `<div class="flex h-40 items-center justify-center bg-gray-800">
                    <svg class="h-10 w-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
                  </div>`;
                }
              }}
            />
          ) : (
            <div className="flex h-40 items-center justify-center bg-gray-800">
              <Newspaper className="h-10 w-10 text-gray-600" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-base font-semibold text-white">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded min-h-[44px]"
          >
            {item.title || 'No title available'}
            <ExternalLink className="inline-block h-3 w-3 flex-shrink-0 text-gray-500" />
          </a>
        </h3>

        {/* Summary */}
        <p className="line-clamp-3 flex-1 text-sm text-gray-400">
          {item.summary || 'No summary available.'}
        </p>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-500">Source</p>
            <p className="truncate font-medium text-gray-300">
              {item.source || item.source_name || 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Published</p>
            <p className="font-medium text-gray-300">
              {parseDate(item.published_at || item.date)}
            </p>
          </div>
        </div>

        {/* Reliability */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Reliability:</span>
          <Badge className={cn('text-xs border-0', reliabilityConfig.badge)}>
            {reliabilityScore}% ({reliabilityConfig.label})
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="text-gray-500 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Reliability info"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] border border-gray-800 bg-gray-900 text-white">
              <p className="text-xs">Source reliability score based on historical accuracy.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Sentiment & Confidence */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Sentiment:</span>
            <Badge className={cn('rounded-full px-2 py-0.5 text-xs capitalize border', config.badgeClass)}>
              <SentimentIcon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Confidence:</span>
            <div className="relative h-1.5 flex-1 rounded bg-gray-800">
              <div
                className={cn(
                  'absolute inset-0 h-full rounded transition-all',
                  sentiment === 'positive' ? 'bg-green-400' :
                  sentiment === 'negative' ? 'bg-red-400' :
                  'bg-gray-500'
                )}
                style={{ width: `${confidencePercent}%` }}
                role="progressbar"
                aria-valuenow={confidencePercent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="w-12 text-right text-xs text-gray-400">{confidencePercent}%</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-gray-500 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Confidence info"
                >
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] border border-gray-800 bg-gray-900 text-white">
                <p className="text-xs">LSTM model confidence in sentiment analysis.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Key Phrases */}
        {keyPhrases.length > 0 && (
          <div className="border-t border-gray-800 pt-2">
            <h4 className="mb-1.5 text-xs font-medium text-gray-300">Key Phrases</h4>
            <div className="flex flex-wrap gap-1.5">
              {keyPhrases.slice(0, 5).map((phrase, index) => (
                <Badge
                  key={`phrase-${index}`}
                  variant="outline"
                  className="rounded-full px-2 py-0.5 text-[10px] border-gray-700 text-gray-400"
                >
                  {phrase}
                </Badge>
              ))}
              {keyPhrases.length > 5 && (
                <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] border-gray-700 text-gray-400">
                  +{keyPhrases.length - 5} more
                </Badge>
              )}
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
    keyPhrases: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]),
    key_phrases: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]),
    image: PropTypes.string,
    banner_image_url: PropTypes.string,
    symbol: PropTypes.string,
    source_reliability: PropTypes.number,
  }).isRequired,
};

NewsItem.displayName = 'NewsItem';

export default NewsItem;