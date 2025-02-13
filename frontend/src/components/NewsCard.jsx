import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const NewsCard = ({ article, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex flex-col space-y-3">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {article.title}
          </a>
        </h3>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            article.sentiment === 'positive'
              ? 'bg-green-100 text-green-800'
              : article.sentiment === 'negative'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {article.sentiment}
        </span>
      </div>
      <p className="text-gray-600">{article.summary}</p>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span className="text-xs font-medium">
          Confidence: {(article.confidence * 100).toFixed(1)}%
        </span>
        <span>
          {new Date(article.published_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
        <span className="italic max-w-[30%] truncate">
          {article.source || "Unknown source"}
        </span>
      </div>
    </div>
  </motion.div>
);

NewsCard.propTypes = {
  article: PropTypes.shape({
    url: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    summary: PropTypes.string,
    sentiment: PropTypes.string.isRequired,
    confidence: PropTypes.number.isRequired,
    published_at: PropTypes.string.isRequired,
    source: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
};

export default NewsCard;