import React from 'react';
import { TrendingUp, TrendingDown, Activity, Newspaper, BarChart3, Sparkles } from 'lucide-react';

const DashboardPreview = () => {
  const metrics = [
    { label: 'Sentiment', value: 'Bullish', change: '+12%', color: 'text-green-500' },
    { label: 'Confidence', value: '78%', change: '+5%', color: 'text-blue-500' },
    { label: 'Predictions', value: '23', change: '+3', color: 'text-purple-500' },
    { label: 'News Analyzed', value: '1,847', change: '+234', color: 'text-orange-500' },
  ];

  const newsItems = [
    { title: 'Apple Reports Strong Quarterly Earnings', sentiment: 'Positive', source: 'Reuters' },
    { title: 'Fed Signals Rate Pause in June', sentiment: 'Neutral', source: 'Bloomberg' },
    { title: 'Tesla Faces Production Delays in Berlin', sentiment: 'Negative', source: 'CNBC' },
  ];

  const stockCards = [
    { symbol: 'AAPL', price: 189.50, change: '+2.4%', sentiment: 'Bullish' },
    { symbol: 'TSLA', price: 245.60, change: '-1.5%', sentiment: 'Bearish' },
    { symbol: 'GOOGL', price: 142.80, change: '+0.8%', sentiment: 'Bullish' },
    { symbol: 'MSFT', price: 378.90, change: '-0.3%', sentiment: 'Neutral' },
  ];

  return (
    <div className="w-full bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
      {/* Dashboard Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-xs text-gray-400 font-mono">Tickflow Sentiment — Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Live</span>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-4 space-y-4">
        {/* Symbol Search Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-800 rounded-lg px-4 py-2 border border-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm text-gray-400">Search stocks...</span>
            <span className="ml-auto text-xs text-gray-600 bg-gray-700 px-2 py-0.5 rounded">⌘K</span>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Analyze
          </button>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-4 gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400">{metric.label}</div>
              <div className="flex items-end justify-between mt-1">
                <span className={`text-lg font-bold ${metric.color}`}>{metric.value}</span>
                <span className="text-xs text-green-400">{metric.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Stock Cards */}
          <div className="col-span-2 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {stockCards.map((stock) => (
                <div key={stock.symbol} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{stock.symbol}</div>
                      <div className="text-xs text-gray-400">{stock.sentiment}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">${stock.price.toFixed(2)}</div>
                      <div className={`text-xs ${stock.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                        {stock.change}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${stock.change.startsWith('+') ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.random() * 60 + 20}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mini Chart */}
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Price Trend</span>
                <span className="text-xs text-green-400">+2.4%</span>
              </div>
              <div className="h-12 flex items-end gap-0.5">
                {[45, 52, 48, 55, 60, 58, 65, 62, 70, 68, 75, 80, 78, 85, 82].map((height, i) => (
                  <div 
                    key={i}
                    className="flex-1 bg-blue-500/30 rounded-sm"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* News Feed */}
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Newspaper className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium text-gray-300">Latest News</span>
            </div>
            <div className="space-y-2">
              {newsItems.map((item, idx) => (
                <div key={idx} className="border-b border-gray-700 last:border-0 pb-2 last:pb-0">
                  <div className="text-xs text-gray-300 line-clamp-2">{item.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      item.sentiment === 'Positive' ? 'bg-green-500/20 text-green-400' :
                      item.sentiment === 'Negative' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-600/30 text-gray-400'
                    }`}>
                      {item.sentiment}
                    </span>
                    <span className="text-[10px] text-gray-500">{item.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Status */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-700 pt-2">
          <span>Last updated: 2 min ago</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              System Online
            </span>
            <span>v2.4.1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPreview;