import { useEffect, useCallback, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import NewsSkeleton from "./NewsSkeleton";
import { FaSyncAlt } from "react-icons/fa";

// Configure API client
const newsApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api/news",
  timeout: 5000,
});

const NewsList = ({ stockSymbol = "IBM", newsData = [], setNewsData }) => {
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const CACHE_TTL = 60 * 60 * 1000; // 1 hour

  const fetchNews = useCallback(async (symbol) => {
    try {
      const response = await newsApi.get("/analyzed/", {
        params: { symbol },
        validateStatus: (status) => status >= 200 && status < 500,
      });

      if (response.status === 429) {
        throw new Error("API rate limit exceeded. Please try again later.");
      }

      if (!response.data?.news) {
        throw new Error("Invalid news data format from API");
      }

      return response.data.news.map(article => ({
        url: article.url || "#",
        title: article.title || "No title",
        summary: article.summary || "",
        sentiment: article.sentiment?.toLowerCase() || "neutral",
        confidence: article.confidence || 0.5,
        published_at: article.published_at || new Date().toISOString(),
        source: article.source || "Unknown",
        raw_data: article.raw_data || {},
      }));
      
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                         err.message || 
                         "Failed to fetch news data";
      throw new Error(errorMessage);
    }
  }, []);

  const fetchWithCache = useCallback(async () => {
    const cacheKey = `news-${stockSymbol}`;
    
    try {
      const cachedData = localStorage.getItem(cacheKey);
      const now = Date.now();

      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        if (now - timestamp < CACHE_TTL && data?.length > 0) {
          setLastUpdated(timestamp);
          return data;
        }
      }

      const freshData = await fetchNews(stockSymbol);
      localStorage.setItem(cacheKey, JSON.stringify({
        data: freshData,
        timestamp: now
      }));
      return freshData;
    } catch (err) {
      localStorage.removeItem(cacheKey);
      throw err;
    }
  }, [stockSymbol, fetchNews]);

  const loadNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const articles = await fetchWithCache();
      setNewsData(articles);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchWithCache, setNewsData]);

  useEffect(() => {
    if (!stockSymbol) return;
    
    const abortController = new AbortController();
    loadNews();
    
    return () => abortController.abort();
  }, [stockSymbol, loadNews]);

  const handleRefresh = () => {
    localStorage.removeItem(`news-${stockSymbol}`);
    loadNews();
  };

  const getSentimentStyle = (sentiment) => {
    const styles = {
      positive: "bg-green-100 text-green-800",
      negative: "bg-red-100 text-red-800",
      neutral: "bg-gray-100 text-gray-800"
    };
    return styles[sentiment] || styles.neutral;
  };

  const filteredNews = Array.isArray(newsData) 
    ? newsData.filter(item => filter === "all" || item.sentiment === filter)
    : [];

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">
          {stockSymbol} News Analysis
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
            Refresh Data
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white"
            disabled={loading}
          >
            {["all", "positive", "negative", "neutral"].map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {lastUpdated && (
        <div className="text-sm text-gray-500 mb-4">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}

      {loading && <NewsSkeleton />}

      {error && (
        <div className="p-4 bg-red-50 rounded-lg text-red-600 mb-4">
          {error} {error.includes("rate limit") && "(try again in 60 minutes)"}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {filteredNews.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
              No news matching current filters
            </div>
          ) : (
            filteredNews.map((article, index) => (
              <NewsCard 
                key={`${article.url}-${index}`}
                article={article}
                getSentimentStyle={getSentimentStyle}
                index={index}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const NewsCard = ({ article, getSentimentStyle, index }) => (
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
          className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentStyle(article.sentiment)}`}
        >
          {article.sentiment}
        </span>
      </div>
      <p className="text-gray-600">{article.summary}</p>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {new Date(article.published_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
        <span className="italic max-w-[50%] truncate">
          {article.source || "Unknown source"}
        </span>
      </div>
    </div>
  </motion.div>
);

NewsList.propTypes = {
  stockSymbol: PropTypes.string,
  newsData: PropTypes.array,
  setNewsData: PropTypes.func.isRequired,
};

NewsCard.propTypes = {
  article: PropTypes.shape({
    url: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    summary: PropTypes.string,
    sentiment: PropTypes.string.isRequired,
    published_at: PropTypes.string.isRequired,
    source: PropTypes.string,
    confidence: PropTypes.number.isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
  getSentimentStyle: PropTypes.func.isRequired,
};

export default NewsList;