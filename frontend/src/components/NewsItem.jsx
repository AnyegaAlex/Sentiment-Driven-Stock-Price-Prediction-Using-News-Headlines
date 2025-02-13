// src/components/NewsItem.jsx
import PropTypes from "prop-types";

const NewsItem = ({ article }) => {
  return (
    <li className="p-4 bg-white shadow rounded">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xl font-semibold text-blue-600 hover:underline"
      >
        {article.title}
      </a>
      <p className="text-gray-600 mt-2">
        {article.summary || "No summary available."}
      </p>
      <div className="text-sm text-gray-500 mt-2">
        <span>{new Date(article.published_at).toLocaleDateString()}</span>
        {" | "}
        <span>{article.source || "Unknown source"}</span>
      </div>
    </li>
  );
};

NewsItem.propTypes = {
  article: PropTypes.shape({
    url: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    summary: PropTypes.string,
    published_at: PropTypes.string.isRequired,
    source: PropTypes.string,
  }).isRequired,
};

export default NewsItem;
