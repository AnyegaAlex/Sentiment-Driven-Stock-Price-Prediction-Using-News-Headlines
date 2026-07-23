// pages/Onboarding/Step3_Watchlist.jsx
/**
 * Step 3 – Build your watchlist.
 * Uses the existing SymbolSearchCard component for stock search,
 * and manages the local watchlist state.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import SymbolSearchCard from '@/components/header/SymbolSearchCard';

const POPULAR_STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'JPM', 'IBM'];
const MAX_WATCHLIST = 20;

const propTypes = {
  /** Form data object containing watchlist */
  formData: PropTypes.shape({
    watchlist: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  /** Function to update form data */
  setFormData: PropTypes.func.isRequired,
  /** Function to proceed to next step */
  onNext: PropTypes.func.isRequired,
  /** Function to skip onboarding */
  onSkip: PropTypes.func.isRequired,
  /** Whether a loading action is in progress */
  isLoading: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

const Step3_Watchlist = ({
  formData,
  setFormData,
  onNext,
  onSkip,
  isLoading = false,
  className = '',
}) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const watchlist = formData.watchlist || [];

  const addToWatchlist = (symbol) => {
    if (!symbol) return;
    
    if (watchlist.length >= MAX_WATCHLIST) {
      setError(`You can add up to ${MAX_WATCHLIST} stocks`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (!watchlist.includes(symbol)) {
      setFormData({
        ...formData,
        watchlist: [...watchlist, symbol],
      });
      setSuccess(`Added ${symbol}`);
      setTimeout(() => setSuccess(''), 2000);
      setError('');
    }
  };

  const removeFromWatchlist = (symbol) => {
    setFormData({
      ...formData,
      watchlist: watchlist.filter((s) => s !== symbol),
    });
  };

  const clearWatchlist = () => {
    if (watchlist.length > 0) {
      setFormData({
        ...formData,
        watchlist: [],
      });
    }
  };

  const validate = () => {
    if (watchlist.length === 0) {
      setError('Add at least one stock to your watchlist');
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (validate()) {
      onNext();
    }
  };

  const isPopularAdded = (symbol) => watchlist.includes(symbol);

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Build your watchlist
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Add stocks you want to track. You can always update this later.
        </p>
      </div>

      {/* Error / Success messages */}
      {error && (
        <Alert variant="destructive" className="animate-slide-down">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2">{error}</span>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <span className="text-green-700 dark:text-green-300">{success}</span>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search stocks
          </label>
          <SymbolSearchCard 
            onSymbolSelect={addToWatchlist} 
            disabled={isLoading}
            placeholder="Search by symbol or name..."
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {watchlist.length} / {MAX_WATCHLIST} stocks added
          </p>
        </div>

        {/* Current watchlist */}
        {watchlist.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Your watchlist ({watchlist.length})
              </h3>
              <button
                type="button"
                onClick={clearWatchlist}
                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                disabled={isLoading}
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2" role="list" aria-live="polite">
              {watchlist.map((symbol) => (
                <div
                  key={symbol}
                  className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-full"
                  role="listitem"
                >
                  <span className="font-semibold">{symbol}</span>
                  <button
                    type="button"
                    onClick={() => removeFromWatchlist(symbol)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors"
                    aria-label={`Remove ${symbol}`}
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular stocks */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Popular stocks
          </h3>
          <div className="flex flex-wrap gap-2">
            {POPULAR_STOCKS.map((symbol) => {
              const isAdded = isPopularAdded(symbol);
              return (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => addToWatchlist(symbol)}
                  disabled={isAdded || isLoading}
                  className={cn(
                    'px-4 py-2 rounded-lg border-2 text-sm transition-all',
                    isAdded
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 cursor-default'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500'
                  )}
                  aria-pressed={isAdded}
                >
                  {symbol} {isAdded && '✓'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-4">
        <Button
          type="button"
          onClick={handleContinue}
          disabled={watchlist.length === 0 || isLoading}
          size="lg"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          disabled={isLoading}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Skip
        </Button>
      </div>
    </div>
  );
};

Step3_Watchlist.propTypes = propTypes;

export default Step3_Watchlist;