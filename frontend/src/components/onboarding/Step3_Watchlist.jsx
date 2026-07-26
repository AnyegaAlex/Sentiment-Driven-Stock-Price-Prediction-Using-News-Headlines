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
import { AlertCircle, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import SymbolSearchCard from '@/components/Header/SymbolSearchCard';

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
        <h2 className="text-2xl font-bold text-white mb-2">
          Build your watchlist
        </h2>
        <p className="text-gray-400">
          Add stocks you want to track. You can always update this later.
        </p>
      </div>

      {/* Error / Success messages */}
      {error && (
        <Alert variant="destructive" className="border border-red-400 bg-red-400/10 text-red-400 animate-slide-down">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="ml-2">{error}</span>
        </Alert>
      )}
      {success && (
        <Alert className="border border-green-400 bg-green-400/10 text-green-400">
          <span>{success}</span>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Search stocks
          </label>
          <SymbolSearchCard 
            onSymbolSelect={addToWatchlist} 
            disabled={isLoading}
            placeholder="Search by symbol or name..."
          />
          <p className="text-sm text-gray-500 mt-1">
            {watchlist.length} / {MAX_WATCHLIST} stocks added
          </p>
        </div>

        {/* Current watchlist */}
        {watchlist.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">
                Your watchlist ({watchlist.length})
              </h3>
              <button
                type="button"
                onClick={clearWatchlist}
                className="text-xs text-red-400 hover:text-red-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded min-h-[44px] px-2"
                disabled={isLoading}
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2" role="list" aria-live="polite">
              {watchlist.map((symbol) => (
                <div
                  key={symbol}
                  className="flex items-center gap-2 bg-gray-800 text-gray-300 px-3 py-2 rounded-full border border-gray-700"
                  role="listitem"
                >
                  <span className="font-semibold text-white">{symbol}</span>
                  <button
                    type="button"
                    onClick={() => removeFromWatchlist(symbol)}
                    className="text-gray-500 hover:text-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
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
          <h3 className="text-sm font-medium text-gray-300 mb-3">
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
                    'px-4 py-2 rounded-lg border-2 text-sm transition-all min-h-[44px]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                    isAdded
                      ? 'border-green-400 bg-green-400/10 text-green-400 cursor-default'
                      : 'border-gray-800 text-gray-400 hover:border-gray-600 hover:bg-gray-800 hover:text-white'
                  )}
                  aria-pressed={isAdded}
                >
                  {symbol} {isAdded && <Check className="inline-block w-4 h-4 ml-1" />}
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
          className="min-h-[44px] bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          disabled={isLoading}
          className="min-h-[44px] text-gray-400 hover:text-white hover:bg-gray-800 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
        >
          Skip
        </Button>
      </div>
    </div>
  );
};

Step3_Watchlist.propTypes = propTypes;

export default Step3_Watchlist;