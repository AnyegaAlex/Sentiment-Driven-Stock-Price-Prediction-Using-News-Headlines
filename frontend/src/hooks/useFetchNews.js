// src/hooks/useFetchNews.js
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const useFetchNews = (stockSymbol) => {
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNews = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    axios
      .get(`https://sentiment-driven-stock-price-prediction.onrender.com/api/news/analyzed/?symbol=${stockSymbol}`, {
        signal: controller.signal,
      })
      .then((response) => {
        setNewsData(response.data.news);
      })
      .catch((err) => {
        if (axios.isCancel(err)) {
          console.log("Request canceled", err.message);
        } else {
          console.error("Error fetching news:", err);
          setError("Failed to load news. Please check your connection and try again.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
    // Cleanup function: abort the request on unmount.
    return () => controller.abort();
  }, [stockSymbol]);

  useEffect(() => {
    const abortFetch = fetchNews();
    return () => abortFetch();
  }, [fetchNews]);

  return { newsData, loading, error, refetch: fetchNews };
};

export default useFetchNews;
