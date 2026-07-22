// components/SymbolSearchCard.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { useSearchSymbolsQuery } from "@/hooks/queries/useSearchSymbolsQuery";
import { Input } from "@/components/ui/input";
import { FaSearch, FaSyncAlt, FaTimes } from "react-icons/fa";
import { cn } from "@/lib/utils";

const propTypes = {
  /** Callback when a symbol is selected */
  onSymbolSelect: PropTypes.func.isRequired,
  /** External value for controlled mode */
  value: PropTypes.string,
  /** Callback for input changes */
  onChange: PropTypes.func,
  /** Placeholder text */
  placeholder: PropTypes.string,
  /** Debounce delay in milliseconds */
  debounceDelay: PropTypes.number,
  /** Disable the search */
  disabled: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

const SymbolSearchCard = ({
  onSymbolSelect,
  value: externalValue,
  onChange,
  placeholder = "Search stock (e.g., AAPL)",
  debounceDelay = 500,
  disabled = false,
  className = "",
}) => {
  const [internalQuery, setInternalQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);
  const timeoutRef = useRef(null);

  // Use external value if provided, otherwise internal
  const query = externalValue !== undefined ? externalValue : internalQuery;

  // Debounce search
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, debounceDelay]);

  // Query for suggestions
  const { 
    data: suggestions = [], 
    isLoading, 
    error, 
    refetch 
  } = useSearchSymbolsQuery(debouncedQuery, {
    enabled: debouncedQuery.length >= 2,
  });

  const handleQueryChange = useCallback((e) => {
    const newValue = e.target.value;
    setInternalQuery(newValue);
    if (onChange) {
      onChange(newValue);
    }
  }, [onChange]);

  const handleSelect = useCallback((symbol) => {
    onSymbolSelect(symbol);
    setInternalQuery(symbol);
    setDebouncedQuery("");
    setIsFocused(false);
    searchRef.current?.blur();
  }, [onSymbolSelect]);

  const clearSearch = useCallback((e) => {
    e.stopPropagation();
    setInternalQuery("");
    setDebouncedQuery("");
    onSymbolSelect(null);
    searchRef.current?.focus();
  }, [onSymbolSelect]);

  const handleBlur = useCallback((e) => {
    // Check if focus moved outside the component
    if (!searchRef.current?.contains(e.relatedTarget)) {
      setIsFocused(false);
    }
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const showSuggestions = isFocused && suggestions.length > 0;

  return (
    <div 
      ref={searchRef}
      className={cn("w-full md:w-auto relative", className)}
      onBlur={handleBlur}
    >
      <div className="relative">
        <div className="flex items-center">
          <FaSearch 
            className="absolute left-3 text-gray-500 dark:text-gray-400" 
            aria-hidden="true" 
          />
          <Input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "pl-10 pr-10 w-full",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Stock symbol search"
            aria-haspopup="listbox"
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
            aria-owns={showSuggestions ? "suggestions-list" : undefined}
            aria-controls={showSuggestions ? "suggestions-list" : undefined}
          />
          {query && !disabled && (
            <button
              onClick={clearSearch}
              className="absolute right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label="Clear search"
              type="button"
            >
              <FaTimes />
            </button>
          )}
          {isLoading && (
            <FaSyncAlt 
              className="absolute right-8 animate-spin text-gray-500 dark:text-gray-400" 
              aria-hidden="true" 
            />
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <ul
            id="suggestions-list"
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
            role="listbox"
            aria-label="Stock suggestions"
          >
            {suggestions.map((item, index) => (
              <li key={`${item.symbol}-${index}`} role="none">
                <button
                  role="option"
                  className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  onClick={() => handleSelect(item.symbol)}
                  tabIndex={0}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{item.symbol}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {item.region}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {item.name}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Loading Skeleton */}
        {isLoading && suggestions.length === 0 && debouncedQuery.length >= 2 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg p-2">
            <div className="animate-pulse space-y-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-1 text-red-500 dark:text-red-400 text-sm" role="alert" aria-live="polite">
            {error.message || "Failed to fetch symbols."}
          </div>
        )}
      </div>
    </div>
  );
};

SymbolSearchCard.propTypes = propTypes;

export default React.memo(SymbolSearchCard);