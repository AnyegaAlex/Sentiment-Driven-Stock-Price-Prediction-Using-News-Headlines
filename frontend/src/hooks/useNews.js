// src/hooks/useNews.js
import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

const useNews = (stockSymbol) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/news/", {
        params: { symbol: stockSymbol },
        timeout: 5000,
      });

      // Process response to extract news articles
      let newsArray = [];
      if (Array.isArray(response.data)) {
        newsArray = response.data;
      } else if (response.data?.news) {
        newsArray = response.data.news;
      } else if (response.data?.results) {
        newsArray = response.data.results;
      } else {
        console.error("Unexpected data format:", response.data);
        newsArray = [];
      }

      setNews(newsArray);
    } catch (err) {
      console.error("Error fetching news:", err);
      setError(err.response?.data?.error || "Failed to fetch news. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [stockSymbol]);

  // Initial fetch on component mount or when stockSymbol changes
  useEffect(() => {
    if (stockSymbol) {
      fetchNews();
    }
  }, [stockSymbol, fetchNews]);

  return { news, loading, error, refetch: fetchNews };
};

export default useNews;
