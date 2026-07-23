/**
 * NewsCard – Displays a single news article with sentiment, confidence, and key phrases
 *
 * Features:
 * - Framer Motion animations with staggered delay
 * - Responsive design with Tailwind
 * - Dark mode support
 * - Accessibility (ARIA labels, semantic HTML)
 * - Memoized for performance
 * - Comprehensive prop validation
 *
 * @component
 * @param {Object} props
 * @param {Object} props.article - News article data
 * @param {number} props.index - Index for stagger animation
 * @returns {JSX.Element}
 */

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

// ============================================================================
// Constants
// ============================================================================

const SENTIMENT_CLASSES = {
  positive: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  negative: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-200',
};

const RELIABILITY_CLASSES = {
  high: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
};

// ============================================================================
// Helper Functions
// ============================================================================

const getSentimentClasses = (sentiment) => {
  return SENTIMENT_CLASSES[sentiment] || SENTIMENT_CLASSES.neutral;
};

const getReliabilityClasses = (reliability) => {
  if (reliability >= 80) return RELIABILITY_CLASSES.high;
  if (reliability >= 50) return RELIABILITY_CLASSES.moderate;
  return RELIABILITY_CLASSES.low;
};

const getReliabilityLabel = (reliability) => {
  if (reliability >= 80) return 'High';
  if (reliability >= 50) return 'Moderate';
  return 'Low';
};

const getKeyPhrases = (phrases) => {
  if (!phrases) return [];
  if (Array.isArray(phrases)) return phrases.filter(Boolean);
  // Split by comma with optional space
  return phrases.split(/,\s*/).filter(Boolean);
};

const formatDate = (dateString) => {
  if (!dateString) return 'Date not available';
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
};

// ============================================================================
// Main Component
// ============================================================================

const NewsCard = ({ article, index = 0 }) => {
  // Memoize computed values
  const sentimentClass = useMemo(
    () => getSentimentClasses(article.sentiment),
    [article.sentiment]
  );

  const reliabilityClass = useMemo(
    () => getReliabilityClasses(article.source_reliability),
    [article.source_reliability]
  );

  const reliabilityLabel = useMemo(
    () => getReliabilityLabel(article.source_reliability),
    [article.source_reliability]
  );

  const keyPhrases = useMemo(
    () => getKeyPhrases(article.key_phrases),
    [article.key_phrases]
  );

  const formattedDate = useMemo(
    () => formatDate(article.published_at),
    [article.published_at]
  );

  const confidenceDisplay = useMemo(() => {
    if (article.confidence === undefined || article.confidence === null) {
      return 'N/A';
    }
    return `${(article.confidence * 100).toFixed(1)}%`;
  }, [article.confidence]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800"
    >
      <div className="flex flex-col space-y-3">
        {/* Title and Sentiment */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">
            <a
              href={article.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              aria-label={`Read full article: ${article.title || 'Untitled article'}`}
            >
              {article.title || 'No title available'}
            </a>
          </h3>
          <span
            className={`mt-2 rounded-full px-2 py-1 text-xs font-medium sm:mt-0 ${sentimentClass}`}
            aria-label={`Article sentiment: ${article.sentiment || 'unknown'}`}
          >
            {article.sentiment
              ? article.sentiment.charAt(0).toUpperCase() + article.sentiment.slice(1)
              : 'Unknown'}
          </span>
        </div>

        {/* Summary */}
        <p className="break-words text-gray-600 dark:text-gray-300">
          {article.summary || 'No summary available'}
        </p>

        {/* Key Phrases */}
        {keyPhrases.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keyPhrases.map((phrase, i) => (
              <span
                key={`${phrase}-${i}`}
                className="truncate rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                title={phrase}
                aria-label={`Key phrase: ${phrase}`}
              >
                {phrase}
              </span>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-1 text-sm text-gray-500 dark:text-gray-400 sm:flex sm:flex-row sm:items-center sm:justify-between">
          {/* Confidence */}
          <span className="text-xs font-medium">
            Confidence: {confidenceDisplay}
          </span>

          {/* Published At */}
          <span>{formattedDate}</span>

          {/* Source and Reliability */}
          <div className="col-span-2 flex items-center gap-2 sm:col-auto">
            <span className="max-w-[30%] truncate italic" aria-label={`News source: ${article.source || 'unknown'}`}>
              {article.source || 'Unknown source'}
            </span>
            {article.source_reliability !== undefined && (
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${reliabilityClass}`}
                title={`Reliability: ${article.source_reliability}%`}
                aria-label={`Source reliability: ${reliabilityLabel}`}
              >
                {article.source_reliability}% ({reliabilityLabel})
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
};

// ============================================================================
// PropTypes
// ============================================================================

NewsCard.propTypes = {
  article: PropTypes.shape({
    url: PropTypes.string,
    title: PropTypes.string,
    summary: PropTypes.string,
    sentiment: PropTypes.oneOf(['positive', 'negative', 'neutral']),
    confidence: PropTypes.number,
    published_at: PropTypes.string,
    source: PropTypes.string,
    key_phrases: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    source_reliability: PropTypes.number,
  }).isRequired,
  index: PropTypes.number,
};

NewsCard.defaultProps = {
  index: 0,
};

NewsCard.displayName = 'NewsCard';

export default React.memo(NewsCard);