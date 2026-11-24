import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSearchSymbolsQuery } from '@/hooks/queries/useSearchSymbolsQuery';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getActionErrorMessage } from '@/utils/errorHandler';

const propTypes = {
  onSymbolSelect: PropTypes.func.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  debounceDelay: PropTypes.number,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

const SymbolSearchCard = ({
  onSymbolSelect,
  value: externalValue,
  onChange,
  placeholder = 'Search by company or ticker',
  debounceDelay = 350,
  disabled = false,
  className = '',
}) => {
  const [internalQuery, setInternalQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const query = externalValue !== undefined ? externalValue : internalQuery;

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), debounceDelay);
    return () => clearTimeout(timeout);
  }, [query, debounceDelay]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  const {
    data: suggestions = [],
    isLoading,
    error,
  } = useSearchSymbolsQuery(debouncedQuery, {
    enabled: debouncedQuery.length >= 2,
  });

  const updateQuery = useCallback((nextValue) => {
    if (externalValue === undefined) setInternalQuery(nextValue);
    onChange?.(nextValue);
  }, [externalValue, onChange]);

  const handleSelect = useCallback((symbol) => {
    const normalized = symbol.toUpperCase();
    updateQuery(normalized);
    onSymbolSelect(normalized);
    setDebouncedQuery('');
    setActiveIndex(-1);
    setIsFocused(false);
    inputRef.current?.blur();
  }, [onSymbolSelect, updateQuery]);

  const clearSearch = useCallback(() => {
    updateQuery('');
    setDebouncedQuery('');
    setActiveIndex(-1);
    onSymbolSelect(null);
    setIsFocused(true);
    inputRef.current?.focus();
  }, [onSymbolSelect, updateQuery]);

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setIsFocused(true);
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
      return;
    }
    if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === 'Escape') {
      setIsFocused(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelect(suggestions[activeIndex].symbol);
        return;
      }

      const exactMatch = suggestions.find(
        (item) => item.symbol?.toUpperCase() === query.trim().toUpperCase()
      );
      if (exactMatch) {
        handleSelect(exactMatch.symbol);
        return;
      }

      const typedSymbol = query.trim().toUpperCase();
      if (/^[A-Z][A-Z0-9.-]{0,9}$/.test(typedSymbol)) {
        handleSelect(typedSymbol);
      }
    }
  };

  const handleBlur = (event) => {
    if (!rootRef.current?.contains(event.relatedTarget)) {
      setIsFocused(false);
      setActiveIndex(-1);
    }
  };

  const showSuggestions = isFocused && suggestions.length > 0;
  const showNoResults =
    isFocused &&
    debouncedQuery.length >= 2 &&
    !isLoading &&
    !error &&
    suggestions.length === 0;

  return (
    <div
      ref={rootRef}
      className={cn('relative w-full', className)}
      onBlur={handleBlur}
    >
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          aria-hidden="true"
          size={16}
        />
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'min-h-[44px] w-full border-gray-800 bg-gray-900 pl-10 pr-20 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          aria-label="Search stocks by company or ticker"
          aria-haspopup="listbox"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          aria-controls={showSuggestions ? 'stock-search-suggestions' : undefined}
          aria-activedescendant={
            activeIndex >= 0 ? 'stock-search-option-' + activeIndex : undefined
          }
        />

        {isLoading && debouncedQuery.length >= 2 && (
          <RefreshCw
            className="absolute right-12 top-1/2 -translate-y-1/2 animate-spin text-gray-500"
            aria-hidden="true"
            size={14}
          />
        )}

        {query && !disabled && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-0 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-md text-gray-500 transition-colors hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            aria-label="Clear stock search"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}

        {showSuggestions && (
          <ul
            id="stock-search-suggestions"
            className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-gray-800 bg-gray-900 py-1 shadow-lg"
            role="listbox"
            aria-label="Matching stocks"
          >
            {suggestions.map((item, index) => (
              <li key={item.symbol} role="presentation">
                <button
                  id={'stock-search-option-' + index}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(item.symbol)}
                  className={cn(
                    'min-h-[52px] w-full px-3 py-2 text-left transition-colors focus-visible:outline-none',
                    activeIndex === index ? 'bg-gray-700' : 'hover:bg-gray-800'
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{item.symbol}</span>
                    {item.region && <span className="text-xs text-gray-500">{item.region}</span>}
                  </span>
                  <span className="block truncate text-sm text-gray-400">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {isLoading && debouncedQuery.length >= 2 && (
          <p role="status" className="absolute z-40 mt-1 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-400">
            Searching stocks…
          </p>
        )}

        {showNoResults && (
          <p role="status" className="absolute z-40 mt-1 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-400">
            No matches found. If you know the ticker, press Enter to search it.
          </p>
        )}

        {error && isFocused && (
          <p role="alert" className="absolute z-40 mt-1 w-full rounded-md border border-red-400/40 bg-gray-900 px-3 py-2 text-sm text-red-300">
            {getActionErrorMessage(error, 'Stock search is temporarily unavailable. You can still enter a ticker and press Enter.')}
          </p>
        )}
      </div>
    </div>
  );
};

SymbolSearchCard.propTypes = propTypes;

export default React.memo(SymbolSearchCard);
