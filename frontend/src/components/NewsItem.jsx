import PropTypes from "prop-types";

const NewsItem = ({ article }) => {
  return (
    <li className="p-4 bg-white shadow rounded">
      {article.banner_image_url && (
        <img
          src={article.banner_image_url}
          alt="Article banner"
          className="w-full h-48 object-cover rounded mb-4"
        />
      )}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xl font-semibold text-blue-600 hover:underline"
        aria-label={`Read full article: ${article.title}`}
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
    banner_image_url: PropTypes.string, // Optional banner image URL
  }).isRequired,
};

export default NewsItem;
