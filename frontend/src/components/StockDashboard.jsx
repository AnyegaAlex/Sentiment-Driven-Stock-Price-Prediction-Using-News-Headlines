// src/components/StockDashboard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import StockOpinionCard from './cards/StockOpinionCard';
import TechnicalIndicatorsCard from './cards/TechnicalIndicatorsCard';
import SentimentAnalysisCard from './cards/SentimentAnalysisCard';
import NewsList from './NewsList';

// Reusable Placeholder (Skeleton/Loading UI)
const PlaceholderCard = ({ message }) => (
  <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-800 text-center space-y-2 animate-pulse">
    <p className="text-gray-500 dark:text-gray-400 text-sm">{message}</p>
    <div className="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
  </div>
);

PlaceholderCard.propTypes = {
  message: PropTypes.string.isRequired,
};

const StockDashboard = ({ stockData, isLoading }) => {
  // Safe destructuring of stockData
  const hasData = stockData && typeof stockData === 'object';
  const { opinion, technical, symbol, news_data: newsData } = hasData ? stockData : {};

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!stockData) {
    return <p className="text-center text-red-500">Failed to load data. Please try again.</p>;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Stock Opinion Card */}
      {opinion ? (
        <StockOpinionCard opinion={opinion} />
      ) : (
        <PlaceholderCard message="Loading stock opinion..." />
      )}

      {/* Technical Indicators Card */}
      {technical && symbol ? (
        <TechnicalIndicatorsCard technical={technical} symbol={symbol} />
      ) : (
        <PlaceholderCard message="Loading technical indicators..." />
      )}

      {/* Sentiment Analysis Card */}
      {opinion?.factors ? (
        <SentimentAnalysisCard
          sentiment={opinion.factors.aggregated_sentiment}
          newsCount={opinion.factors.news_count || 0}
        />
      ) : (
        <PlaceholderCard message="Loading sentiment analysis..." />
      )}

      {/* News List */}
      {newsData ? (
        <NewsList news={newsData} />
      ) : (
        <PlaceholderCard message="Loading news data..." />
      )}
    </div>
  );
};

StockDashboard.propTypes = {
  stockData: PropTypes.shape({
    symbol: PropTypes.string,
    opinion: PropTypes.shape({
      symbol: PropTypes.string.isRequired,
      action: PropTypes.string,
      confidence: PropTypes.shape({
        technical: PropTypes.string,
        sentiment: PropTypes.string,
        composite: PropTypes.string,
      }),
      risk_metrics: PropTypes.shape({
        stop_loss: PropTypes.number,
        take_profit: PropTypes.number,
      }),
      contrarian_warnings: PropTypes.arrayOf(PropTypes.string),
      timestamp: PropTypes.string,
      factors: PropTypes.shape({
        aggregated_sentiment: PropTypes.number,
        news_count: PropTypes.number,
      }),
    }),
    technical: PropTypes.shape({
      sma_50: PropTypes.number,
      sma_200: PropTypes.number,
      rsi: PropTypes.number,
      pivot: PropTypes.number,
      support: PropTypes.number,
      resistance: PropTypes.number,
    }),
    news_data: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string.isRequired,
        summary: PropTypes.string.isRequired,
        source: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
        published_at: PropTypes.string.isRequired,
        sentiment: PropTypes.string.isRequired,
        confidence: PropTypes.number.isRequired,
        key_phrases: PropTypes.string.isRequired,
        source_reliability: PropTypes.number.isRequired,
        banner_image_url: PropTypes.string,
      })
    ),
  }),
  isLoading: PropTypes.bool,
};

export default StockDashboard;