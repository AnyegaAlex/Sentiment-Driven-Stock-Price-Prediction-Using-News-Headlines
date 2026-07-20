// pages/Onboarding/Step3_Watchlist.jsx
/**
 * Step 3 – Build your watchlist.
 * Uses the existing SymbolSearchCard component for stock search,
 * and manages the local watchlist state.
 */

import React from 'react';
import SymbolSearchCard from '@/components/header/SymbolSearchCard';

const Step3_Watchlist = ({ formData, setFormData }) => {
  const addToWatchlist = (symbol) => {
    if (!symbol) return;
    if (!formData.watchlist.includes(symbol)) {
      setFormData({
        ...formData,
        watchlist: [...formData.watchlist, symbol],
      });
    }
  };

  const removeFromWatchlist = (symbol) => {
    setFormData({
      ...formData,
      watchlist: formData.watchlist.filter((s) => s !== symbol),
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Build your watchlist
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Add stocks you want to track. You can always update this later.
      </p>

      <div className="space-y-6">
        {/* Reuse the existing SymbolSearchCard */}
        <SymbolSearchCard onSymbolSelect={addToWatchlist} />

        {/* Current watchlist */}
        {formData.watchlist.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Your watchlist ({formData.watchlist.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {formData.watchlist.map((symbol) => (
                <div
                  key={symbol}
                  className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-full"
                >
                  <span className="font-semibold">{symbol}</span>
                  <button
                    type="button"
                    onClick={() => removeFromWatchlist(symbol)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                    aria-label={`Remove ${symbol}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick add popular stocks (optional) */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Popular stocks
          </h3>
          <div className="flex flex-wrap gap-2">
            {['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'].map((symbol) => {
              const isAdded = formData.watchlist.includes(symbol);
              return (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => addToWatchlist(symbol)}
                  disabled={isAdded}
                  className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                    isAdded
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 cursor-default'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {symbol} {isAdded && '✓'}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step3_Watchlist;