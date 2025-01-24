import React, { useState, useEffect } from "react";
import { fetchNews } from "../services/news";
import { fetchStocks } from "../services/stocks";
import NewsTable from "../components/NewsTable";
import StockChart from "../components/StockChart";

const Dashboard = () => {
  const [news, setNews] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [symbol, setSymbol] = useState("IBM");

  useEffect(() => {
    const loadData = async () => {
      try {
        const newsData = await fetchNews();
        setNews(newsData);

        const stockData = await fetchStocks(symbol);
        setStockData(stockData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, [symbol]);

  return (
    <div>
      <h1>Sentiment-Driven Stock Price Prediction</h1>
      <div>
        <label htmlFor="symbol">Stock Symbol: </label>
        <input
          id="symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Enter stock symbol (e.g., AAPL)"
        />
      </div>
      <StockChart stockData={stockData} />
      <NewsTable news={news} />
    </div>
  );
};

export default Dashboard;
