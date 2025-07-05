import PropTypes from "prop-types";
import { memo } from "react";

const NewsItem = memo(function NewsItem ({ article }) {
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <li className="p-4 bg-white dark:bg-gray-800 shadow rounded-lg hover:shadow-md transition-shadow">
      {article.banner_image_url && (
        <div className="relative w-full h-48 mb-4 rounded overflow-hidden">
          <img
            src={article.banner_image_url}
            alt={article.title || "News article banner"}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xl font-semibold text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        aria-label={`Read full article: ${article.title || 'Untitled article'}`}
      >
        {article.title || "No title available"}
      </a>
      <p className="text-gray-600 dark:text-gray-300 mt-2">
        {article.summary || "No summary available."}
      </p>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex flex-wrap gap-x-2">
        <span>{formatDate(article.published_at)}</span>
        <span aria-hidden="true">|</span>
        <span>{article.source || "Unknown source"}</span>
      </div>
    </li>
  );
});

NewsItem.propTypes = {
  article: PropTypes.shape({
    url: PropTypes.string,
    title: PropTypes.string,
    summary: PropTypes.string,
    published_at: PropTypes.string,
    source: PropTypes.string,
    banner_image_url: PropTypes.string,
  }).isRequired,
};

NewsItem.defaultProps = {
  article: {
    url: "#",
    title: "No title available",
    summary: "No summary available.",
    source: "Unknown source"
  }
};

export default NewsItem;