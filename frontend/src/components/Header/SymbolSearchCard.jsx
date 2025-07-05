import { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { FaSearch, FaSyncAlt, FaTimes } from "react-icons/fa";
import SearchSkeleton from "../SearchSkeleton";

const SymbolSearchCard = ({ onSymbolSelect }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchRef = useRef(null);
  const timeoutRef = useRef(null);

  // API config
  const API_CONFIG = useRef({
    alphaVantage: {
      key: import.meta.env.VITE_ALPHA_VANTAGE_KEY,
      url: "https://www.alphavantage.co/query",
    },
    yahooFinance: {
      key: import.meta.env.VITE_RAPIDAPI_KEY,
      host: "apidojo-yahoo-finance-v1.p.rapidapi.com",
      url: "https://apidojo-yahoo-finance-v1.p.rapidapi.com/auto-complete",
    },
    finnhub: {
      key: import.meta.env.VITE_FINNHUB_KEY,
      url: "https://finnhub.io/api/v1/search",
    },
  });

  const fetchSymbols = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    const { alphaVantage, yahooFinance, finnhub } = API_CONFIG.current;

    try {
      // Try sources sequentially
      const sources = [
        async () => {
          const { data } = await axios.get(alphaVantage.url, {
            params: { function: "SYMBOL_SEARCH", keywords: searchQuery, apikey: API_CONFIG.alphaVantage.key },
            timeout: 3000,
          });
          return data.bestMatches?.map(stock => ({
            symbol: stock["1. symbol"],
            name: stock["2. name"],
            region: stock["4. region"],
          })) || [];
        },
        async () => {
          const { data } = await axios.get(yahooFinance.url, {
            headers: {
              "x-rapidapi-key": API_CONFIG.yahooFinance.key,
              "x-rapidapi-host": API_CONFIG.yahooFinance.host,
            },
            params: { q: searchQuery, region: "US" },
            timeout: 3000,
          });
          return data.quotes?.map(item => ({
            symbol: item.symbol,
            name: item.shortname,
            region: item.region || "US",
          })) || [];
        },
        async () => {
          const { data } = await axios.get(finnhub.url, {
            params: { q: searchQuery, token: API_CONFIG.finnhub.key },
            timeout: 3000,
          });
          return data.result?.map(item => ({
            symbol: item.symbol,
            name: item.description,
            region: "US",
          })) || [];
        }
      ];

      for (const source of sources) {
        try {
          const results = await source();
          if (results.length > 0) {
            setSuggestions(results.slice(0, 5));
            return;
          }
        } catch (err) {
          console.warn(`API source failed: ${err.message}`);
        }
      }

      setError("No results found. Try a different symbol.");
    } catch (error) {
      setError("Failed to fetch symbols. Please try again.");
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      fetchSymbols(query);
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, fetchSymbols]);

  const handleSelect = (symbol) => {
    onSymbolSelect(symbol);
    setQuery(symbol);
    setSuggestions([]);
  };

  const clearSearch = () => {
    setQuery("");
    setSuggestions([]);
    setError(null);
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
          {loading && (
            <FaSyncAlt 
              className="absolute right-8 animate-spin text-gray-500 dark:text-gray-400" 
              aria-hidden="true" 
            />
          )}
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <ul 
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
            role="listbox"
          >
            {suggestions.map((item, index) => (
              <li
                key={`${item.symbol}-${index}`}
                role="option"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleSelect(item.symbol)}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(item.symbol)}
                tabIndex={0}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{item.symbol}</span>
                  <span className="text-gray-500 dark:text-gray-400">{item.region}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {item.name}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Loading and error states */}
        {loading && suggestions.length === 0 && <SearchSkeleton />}
        {error && (
          <div className="mt-1 text-red-500 dark:text-red-400 text-sm" role="alert">
            {error}
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