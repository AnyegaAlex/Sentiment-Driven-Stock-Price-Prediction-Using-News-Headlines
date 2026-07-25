import React, { useState, useEffect } from 'react';

const endpoints = [
  {
    name: 'Unified Stock Analysis',
    path: '/api/v1/stock-analysis/',
    curl: `curl -X GET "https://sentiment-driven-stock-price-prediction.onrender.com/api/v1/stock-analysis/?symbol=AAPL" -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "symbol": "AAPL",
  "recommendation": "BUY",
  "confidence": 0.851,
  "sentiment": {
    "overall": "Neutral",
    "score": -0.0108,
    "recent_articles": 10
  },
  "technicalIndicators": {
    "currentPrice": 116.16,
    "sma50": 114.84,
    "sma200": 111.81,
    "rsi": 70.8,
    "support": 110.35,
    "resistance": 121.97,
    "volume": 12424000
  },
  "priceTargets": {
    "bearish": 104.54,
    "base": 116.16,
    "bullish": 132.42
  },
  "riskAssessment": {
    "level": "medium",
    "horizon": "medium-term"
  },
  "lstm_prediction": {
    "direction": "HOLD",
    "confidence": 50.0,
    "fallback": true,
    "message": "Using sentiment-based fallback due to insufficient price history"
  }
}`,
  },
  {
    name: 'Technical Indicators',
    path: '/api/v1/technical-indicators/',
    curl: `curl -X GET "https://sentiment-driven-stock-price-prediction.onrender.com/api/v1/technical-indicators/?symbol=TSLA" -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "success": true,
  "data": {
    "technical": {
      "current_price": 245.32,
      "sma_50": 240.18,
      "sma_200": 210.18,
      "rsi": 58.2,
      "support": 220.00,
      "resistance": 270.00,
      "pivot": 245.00,
      "volume": 15200000,
      "volatility": 0.18,
      "price_history": [245.32, 243.50, 242.00, ...]
    }
  }
}`,
  },
  {
    name: 'Sentiment Analysis',
    path: '/api/v1/sentiment-analysis/',
    curl: `curl -X GET "https://sentiment-driven-stock-price-prediction.onrender.com/api/v1/sentiment-analysis/?symbol=GOOGL" -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "success": true,
  "data": {
    "sentiment": {
      "score": 0.42,
      "label": "Positive"
    },
    "news_count": 41,
    "source_stats": {
      "tier1_count": 12,
      "reliability_sum": 9.6,
      "tier1_sources": ["Reuters", "Bloomberg"]
    },
    "history": [
      {"date": "2026-07-15", "score": 0.9984},
      {"date": "2026-07-16", "score": -0.9797}
    ]
  }
}`,
  },
  {
    name: 'LSTM Predict',
    path: '/api/v1/lstm-predict/',
    curl: `curl -X GET "https://sentiment-driven-stock-price-prediction.onrender.com/api/v1/lstm-predict/?symbol=MSFT" -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "success": true,
  "data": {
    "symbol": "MSFT",
    "prediction": "HOLD",
    "confidence": 50.0,
    "fallback": true,
    "sentiment_score": 0.169,
    "message": "Using sentiment-based fallback due to insufficient price history"
  }
}`,
  },
  {
    name: 'Health Check',
    path: '/api/v1/health/',
    curl: `curl -X GET "https://sentiment-driven-stock-price-prediction.onrender.com/api/v1/health/"`,
    response: `{
  "status": "healthy",
  "checks": {
    "database": {"status": "healthy"},
    "redis": {"status": "healthy"},
    "memory": {"status": "healthy", "usage_percent": 68.0},
    "response_time_ms": 1223.04,
    "version": {"app": "1.0.0", "django": "5.1.5"},
    "providers": {"finnhub": {"configured": true}}
  }
}`,
  },
  {
    name: 'Symbols List',
    path: '/api/v1/symbols/',
    curl: `curl -X GET "https://sentiment-driven-stock-price-prediction.onrender.com/api/v1/symbols/"`,
    response: `[
  {"symbol": "AAPL", "name": "Apple Inc.", "region": "US"},
  {"symbol": "MSFT", "name": "Microsoft Corp.", "region": "US"},
  {"symbol": "GOOGL", "name": "Alphabet Inc.", "region": "US"},
  {"symbol": "NVDA", "name": "NVIDIA Corp.", "region": "US"},
  {"symbol": "TSLA", "name": "Tesla Inc.", "region": "US"},
  {"symbol": "AMZN", "name": "Amazon.com Inc.", "region": "US"},
  {"symbol": "META", "name": "Meta Platforms Inc.", "region": "US"},
  {"symbol": "JPM", "name": "JPMorgan Chase", "region": "US"},
  {"symbol": "IBM", "name": "IBM", "region": "US"},
  {"symbol": "VTI", "name": "Vanguard Total Stock Market", "region": "US"}
]`,
  },
];

const APIDemo = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [symbol, setSymbol] = useState('AAPL');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % endpoints.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const currentEndpoint = endpoints[currentIndex];

  const handleRefresh = () => {
    setLastUpdated(new Date());
  };

  return (
    <section className="bg-black py-16 px-4 md:px-8 lg:px-16 border-t border-gray-800">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
          Real API Responses
        </h2>
        <p className="text-gray-400 text-center mb-8">
          See exactly what the platform returns. Auto-rotates every 6 seconds.
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">Endpoint:</span>
              <span className="text-gray-300 font-mono text-sm">{currentEndpoint.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-xs">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
              <button
                onClick={handleRefresh}
                className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-600 transition duration-200"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="px-4 pt-4">
            <span className="text-green-400 font-mono text-sm">GET</span>
            <span className="text-gray-300 font-mono text-sm ml-2">{currentEndpoint.path}</span>
          </div>

          <div className="p-4">
            <div className="bg-black rounded-md p-4 overflow-x-auto">
              <pre className="text-gray-300 text-xs md:text-sm font-mono whitespace-pre-wrap">
                {currentEndpoint.curl}
              </pre>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="bg-black rounded-md p-4 overflow-x-auto max-h-80 overflow-y-auto">
              <pre className="text-gray-300 text-xs md:text-sm font-mono whitespace-pre-wrap">
                {currentEndpoint.response}
              </pre>
            </div>
          </div>

          <div className="px-4 pb-4 text-xs text-gray-500 flex flex-wrap items-center gap-2">
            <span className="inline-block bg-gray-800 px-2 py-1 rounded">Snapshot data</span>
            <span>
              Replace <code className="bg-gray-800 px-1 rounded">YOUR_API_KEY</code> with your actual API key.
            </span>
            <a
              href="https://sentiment-driven-stock-price-predic.vercel.app/signup"
              className="text-blue-400 hover:underline"
            >
              Get your API key
            </a>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs text-gray-500">
          <span>Available endpoints:</span>
          {endpoints.map((ep, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`px-2 py-0.5 rounded hover:text-white transition ${
                i === currentIndex ? 'text-white bg-gray-800' : 'text-gray-500'
              }`}
            >
              {ep.path}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default APIDemo;