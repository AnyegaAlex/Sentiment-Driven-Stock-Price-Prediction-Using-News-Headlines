import React, { useEffect, useState } from "react";
import axios from "axios";

const NewsAnalysis = () => {
  const [news, setNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/news/get-news/");
        setNews(response.data.news);
        setFilteredNews(response.data.news);
      } catch (err) {
        console.error("Error fetching news:", err);
        setError("Failed to fetch news. Please try again later.");
      }
    };

    fetchNews();
  }, []);

  // 🔹 Filter news by sentiment
  const handleFilterChange = (event) => {
    const selectedSentiment = event.target.value;
    setSentimentFilter(selectedSentiment);

    if (selectedSentiment === "all") {
      setFilteredNews(news);
    } else {
      setFilteredNews(news.filter((item) => item.sentiment === selectedSentiment));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">News Analysis</h1>

      {/* 🔹 Sentiment Filter Dropdown */}
      <div className="mb-4">
        <label className="text-lg font-medium mr-2">Filter by Sentiment:</label>
        <select
          className="p-2 border rounded-md"
          value={sentimentFilter}
          onChange={handleFilterChange}
        >
          <option value="all">All</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </div>

      {/* 🔹 Error Handling */}
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : filteredNews.length === 0 ? (
        <p>No news available.</p>
      ) : (
        <div className="space-y-4">
          {filteredNews.map((item, index) => (
            <div key={index} className="p-4 bg-white shadow-md rounded-lg">
              {/* 🔹 News Image */}
              {item.banner_image && (
                <img
                  src={item.banner_image}
                  alt="News Banner"
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}

              {/* 🔹 Title with Clickable Link */}
              <h2 className="text-xl font-semibold">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {item.title}
                </a>
              </h2>

              {/* 🔹 Summary */}
              <p className="text-gray-600 mt-2">{item.summary}</p>

              {/* 🔹 Meta Info */}
              <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                <span>Source: {item.source}</span>
                <span>Published: {new Date(item.published_at).toLocaleString()}</span>
              </div>

              {/* 🔹 Sentiment Badge */}
              <span
                className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${
                  item.sentiment === "positive"
                    ? "bg-green-200 text-green-800"
                    : item.sentiment === "negative"
                    ? "bg-red-200 text-red-800"
                    : "bg-yellow-200 text-yellow-800"
                }`}
              >
                Sentiment: {item.sentiment} ({(item.confidence * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsAnalysis;
