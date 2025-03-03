import { motion } from "framer-motion";
import PropTypes from "prop-types";

/**
 * Displays a single news article card with details such as title, summary, sentiment,
 * confidence score, key phrases, publication date, source, and reliability.
 */
const NewsCard = ({ article, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex flex-col space-y-3">
      {/* Title and Sentiment */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">
          <a
            href={article.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline"
            aria-label={`Read full article: ${article.title}`}
          >
            {article.title || "No title available"}
          </a>
        </h3>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full mt-2 sm:mt-0 ${
            article.sentiment === "positive"
              ? "bg-green-100 text-green-800"
              : article.sentiment === "negative"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
          aria-label={`Article sentiment: ${article.sentiment}`}
        >
          {article.sentiment.charAt(0).toUpperCase() +
            article.sentiment.slice(1)}
        </span>
      </div>

      {/* Summary */}
      <p className="text-gray-600 break-words">
        {article.summary || "No summary available"}
      </p>

      {/* Key Phrases */}
      <div className="flex flex-wrap gap-2">
        {article.key_phrases
          ?.split(", ")
          .map((phrase, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full truncate"
              title={phrase} // Tooltip for long phrases
              aria-label={`Key phrase: ${phrase}`}
            >
              {phrase}
            </span>
          ))}
      </div>

      {/* Metadata */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm text-gray-500">
        {/* Confidence */}
        <span className="text-xs font-medium">
          Confidence: {(article.confidence * 100).toFixed(1)}%
        </span>

        {/* Published At */}
        <span>
          {new Date(article.published_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        {/* Source and Reliability */}
        <div className="flex items-center gap-2">
          <span className="italic max-w-[30%] truncate" aria-label="News source">
            {article.source || "Unknown source"}
          </span>
          <span
            className={`text-xs font-medium rounded-full px-2 py-1 ${
              article.source_reliability >= 90
                ? "bg-green-100 text-green-800"
                : article.source_reliability >= 70
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
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
              : "Low"}{" "}
            Reliability
          </span>
        </div>
      </div>
    </div>
  </motion.div>
);

// Prop Types Validation
NewsCard.propTypes = {
  article: PropTypes.shape({
    url: PropTypes.string.isRequired, // URL of the article
    title: PropTypes.string.isRequired, // Title of the article
    summary: PropTypes.string, // Summary or excerpt of the article
    sentiment: PropTypes.string.isRequired, // Sentiment label (positive, negative, neutral)
    confidence: PropTypes.number.isRequired, // Sentiment confidence score (0–1)
    published_at: PropTypes.string.isRequired, // Publication timestamp
    source: PropTypes.string, // News source name
    key_phrases: PropTypes.string, // Comma-separated key phrases
    source_reliability: PropTypes.number.isRequired, // Source reliability score (0–100)
  }).isRequired,
  index: PropTypes.number.isRequired, // Index for animation delay
};

export default NewsCard;
