import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { memo } from "react";

/**
 * Displays a single news article card with details such as title, summary, sentiment,
 * confidence score, key phrases, publication date, source, and reliability.
 */
const NewsCard = memo(function NewsCard ({ article, index = 0 }) {
  const getSentimentClasses = (sentiment) => {
    switch(sentiment) {
      case 'positive': 
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'negative': 
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: 
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getReliabilityClasses = (reliability) => {
    if (reliability >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (reliability >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date not available";
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex flex-col space-y-3">
        {/* Title and Sentiment */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">
            <a
              href={article.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
              aria-label={`Read full article: ${article.title || 'Untitled article'}`}
            >
              {article.title || "No title available"}
            </a>
          </h3>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full mt-2 sm:mt-0 ${getSentimentClasses(article.sentiment)}`}
            aria-label={`Article sentiment: ${article.sentiment || 'unknown'}`}
          >
            {article.sentiment
              ? article.sentiment.charAt(0).toUpperCase() + article.sentiment.slice(1)
              : "Unknown"}
          </span>
        </div>

        {/* Summary */}
        <p className="text-gray-600 dark:text-gray-300 break-words">
          {article.summary || "No summary available"}
        </p>

        {/* Key Phrases */}
        {article.key_phrases && (
          <div className="flex flex-wrap gap-2">
            {article.key_phrases
              .split(", ")
              .filter(phrase => phrase.trim())
              .map((phrase, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full truncate"
                  title={phrase}
                  aria-label={`Key phrase: ${phrase}`}
                >
                  {phrase}
                </span>
              ))}
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          {/* Confidence */}
          <span className="text-xs font-medium">
            Confidence: {article.confidence ? (article.confidence * 100).toFixed(1) : 'N/A'}%
          </span>

          {/* Published At */}
          <span>
            {formatDate(article.published_at)}
          </span>

          {/* Source and Reliability */}
          <div className="flex items-center gap-2">
            <span className="italic max-w-[30%] truncate" aria-label={`News source: ${article.source || 'unknown'}`}>
              {article.source || "Unknown source"}
            </span>
            {article.source_reliability !== undefined && (
              <span
                className={`text-xs font-medium rounded-full px-2 py-1 ${getReliabilityClasses(article.source_reliability)}`}
                title={`Reliability: ${article.source_reliability}%`}
                aria-label={`Source reliability: ${
                  article.source_reliability >= 90
                    ? "High"
                    : article.source_reliability >= 70
                    ? "Moderate"
                    : "Low"
                }`}
              >
                {article.source_reliability >= 90
                  ? "High"
                  : article.source_reliability >= 70
                  ? "Moderate"
                  : "Low"} Reliability
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
});

// Prop Types Validation
NewsCard.propTypes = {
  article: PropTypes.shape({
    url: PropTypes.string,
    title: PropTypes.string,
    summary: PropTypes.string,
    sentiment: PropTypes.oneOf(['positive', 'negative', 'neutral']),
    confidence: PropTypes.number,
    published_at: PropTypes.string,
    source: PropTypes.string,
    key_phrases: PropTypes.string,
    source_reliability: PropTypes.number,
  }).isRequired,
  index: PropTypes.number,
};

NewsCard.defaultProps = {
  index: 0,
};

export default NewsCard;