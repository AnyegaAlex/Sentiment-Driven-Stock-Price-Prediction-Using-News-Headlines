/**
 * NewsItem – Individual news article card with sentiment, confidence, and key phrases
 *
 * Features:
 * - Memoized for performance
 * - Dark mode support
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
import { Progress } from '@/components/ui/progress';
import { Info, ExternalLink, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

const SENTIMENT_CONFIG = {
  positive: {
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: '📈',
    label: 'Positive',
  },
  neutral: {
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    icon: '➖',
    label: 'Neutral',
  },
  negative: {
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    icon: '📉',
    label: 'Negative',
  },
};

const RELIABILITY_CONFIG = {
  high: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200', label: 'High' },
  medium: { badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200', label: 'Medium' },
  low: { badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', label: 'Low' },
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

  const keyPhrases = useMemo(() => normalizeKeyPhrases(item.key_phrases || item.keyPhrases), [item.key_phrases, item.keyPhrases]);
  const reliabilityScore = item.source_reliability || 0;
  const reliabilityLevel = getReliabilityLevel(reliabilityScore);
  const reliabilityConfig = RELIABILITY_CONFIG[reliabilityLevel];
  const confidencePercent = Math.round((item.confidence || 0) * 100);
  const hasImage = !!(item.banner_image_url || item.image);

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
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
                e.target.parentNode.innerHTML = `<div class="flex h-40 items-center justify-center bg-muted dark:bg-gray-700">
                  <Newspaper class="h-10 w-10 text-muted-foreground" />
                </div>`;
              }}
            />
          ) : (
            <div className="flex h-40 items-center justify-center bg-muted dark:bg-gray-700">
              <Newspaper className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-base font-semibold dark:text-white">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {item.title || 'No title available'}
            <ExternalLink className="inline-block h-3 w-3 flex-shrink-0" />
          </a>
        </h3>

        {/* Summary */}
        <p className="line-clamp-3 flex-1 text-sm text-muted-foreground dark:text-gray-400">
          {item.summary || 'No summary available.'}
        </p>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground dark:text-gray-500">Source</p>
            <p className="truncate font-medium dark:text-gray-300">
              {item.source || item.source_name || 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground dark:text-gray-500">Published</p>
            <p className="font-medium dark:text-gray-300">
              {parseDate(item.published_at || item.date)}
            </p>
          </div>
        </div>

        {/* Reliability */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground dark:text-gray-500">Reliability:</span>
          <Badge className={cn('text-xs', reliabilityConfig.badge)}>
            {reliabilityScore}% ({reliabilityConfig.label})
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground" aria-label="Reliability info">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs">Source reliability score based on historical accuracy.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Sentiment & Confidence */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground dark:text-gray-500">Sentiment:</span>
            <Badge className={cn('rounded-full px-2 py-0.5 text-xs capitalize', config.badgeClass)}>
              {config.icon} {config.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground dark:text-gray-500">Confidence:</span>
            <div className="relative h-1.5 flex-1 rounded bg-gray-200 dark:bg-gray-700">
              <div
                className={cn('absolute inset-0 h-full rounded transition-all', config.progressClass)}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs dark:text-gray-400">{confidencePercent}%</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground" aria-label="Confidence info">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] dark:border-gray-700 dark:bg-gray-900">
                <p className="text-xs">Model confidence in sentiment analysis.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Key Phrases */}
        {keyPhrases.length > 0 && (
          <div className="border-t border-border pt-2 dark:border-gray-700">
            <h4 className="mb-1.5 text-xs font-medium dark:text-gray-300">Key Phrases</h4>
            <div className="flex flex-wrap gap-1.5">
              {keyPhrases.slice(0, 5).map((phrase, index) => (
                <Badge
                  key={`phrase-${index}`}
                  variant="outline"
                  className="rounded-full px-2 py-0.5 text-[10px] dark:border-gray-600 dark:text-gray-300"
                >
                  {phrase}
                </Badge>
              ))}
              {keyPhrases.length > 5 && (
                <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] dark:border-gray-600 dark:text-gray-300">
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