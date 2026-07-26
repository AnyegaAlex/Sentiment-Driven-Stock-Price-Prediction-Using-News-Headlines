import React from 'react';

const features = [
  {
    title: 'News Processing',
    description: 'Multi-source aggregation (Alpha Vantage, Finnhub, Yahoo Finance). SHA-256 deduplication prevents duplicate processing. FinBERT sentiment analysis (Positive/Negative/Neutral) with key phrase extraction and source reliability ranking (1-100) based on trusted sources (Bloomberg, Reuters, FT).',
  },
  {
    title: 'Technical Indicators',
    description: 'SMA-50, SMA-200, RSI (Relative Strength Index), Bollinger Bands (Upper and Lower), Support and Resistance levels, Pivot Points, Volatility, Volume, and 30-day price history.',
  },
  {
    title: 'LSTM Neural Network',
    description: '7 input features (sentiment score + 6 technical indicators: MA7, MA21, STD21, RSI14, UpperBB, LowerBB). 32 hidden units. Directional predictions (UP, DOWN, HOLD). Confidence scoring (0-100%). 7-day resolution tracking with yfinance. Falls back to sentiment-only when insufficient price data (<200 days).',
  },
  {
    title: 'Hybrid Prediction',
    description: 'Weighted average: 50% LSTM, 30% Sentiment, 20% Technicals. Sentiment-only fallback when LSTM model is unavailable or insufficient price history exists (less than 200 trading days).',
  },
];

const TechnicalBreakdown = () => {
  return (
    <section className="bg-black py-16 px-4 md:px-8 lg:px-16 border-t border-gray-800">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
          Technical Breakdown
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          How the platform actually works – from data ingestion to prediction.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="bg-gray-900 border border-gray-800 p-6 rounded-lg hover:border-gray-600 transition duration-200">
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechnicalBreakdown;