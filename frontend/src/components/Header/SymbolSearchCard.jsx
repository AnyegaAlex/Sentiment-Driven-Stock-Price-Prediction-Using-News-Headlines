import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useSearchSymbolsQuery } from "@/hooks/queries/useSearchSymbolsQuery";
import { Input } from "@/components/ui/input";
import { FaSearch, FaSyncAlt, FaTimes } from "react-icons/fa";
import SearchSkeleton from "../SearchSkeleton";

const SymbolSearchCard = ({ onSymbolSelect }) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchRef = useRef(null);
  const timeoutRef = useRef(null);

  // Debounce search
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  const { data: suggestions = [], isLoading, error } = useSearchSymbolsQuery(debouncedQuery);

  const handleSelect = (symbol) => {
    onSymbolSelect(symbol);
    setQuery(symbol);
    setDebouncedQuery(""); // Clear debounced query to close suggestions
    searchRef.current?.blur(); // Remove focus to hide keyboard and dropdown
  };

  const clearSearch = () => {
    setQuery("");
    setDebouncedQuery("");
    onSymbolSelect(null); // Clear the symbol from context
    searchRef.current?.focus();
  };

  return (
    <div className="w-full md:w-auto relative" ref={searchRef}>
      <div className="relative">
        <div className="flex items-center">
          <FaSearch className="absolute left-3 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stock (e.g., AAPL)"
            className="pl-10 pr-10 w-full"
            aria-label="Stock symbol search"
            aria-haspopup="listbox"
            aria-expanded={suggestions.length > 0}
            aria-autocomplete="list"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 text-gray-500 dark:text-gray-400"
              aria-label="Clear search"
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

        {suggestions.length > 0 && (
          <ul
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
            role="listbox"
            aria-label="Stock suggestions"
          >
            {suggestions.map((item, index) => (
              <li key={`${item.symbol}-${index}`} role="none">
                <button
                  role="option"
                  className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => handleSelect(item.symbol)}
                  tabIndex={0}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{item.symbol}</span>
                    <span className="text-gray-500 dark:text-gray-400">{item.region}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {item.name}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {isLoading && suggestions.length === 0 && <SearchSkeleton />}
        {error && (
          <div className="mt-1 text-red-500 dark:text-red-400 text-sm" role="alert" aria-live="polite">
            {error.message || "Failed to fetch symbols."}
          </div>
        )}
      </div>
    </div>
  );
};

SymbolSearchCard.propTypes = {
  onSymbolSelect: PropTypes.func.isRequired,
};

export default SymbolSearchCard;