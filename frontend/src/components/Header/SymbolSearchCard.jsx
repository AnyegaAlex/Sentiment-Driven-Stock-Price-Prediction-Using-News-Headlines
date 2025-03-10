// src/components/Header/SymbolSearchCard.jsx
import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { FaSearch, FaSyncAlt, FaTimes } from "react-icons/fa";
import SearchSkeleton from "../SearchSkeleton"; // Adjust path as needed

const SymbolSearchCard = ({ onSymbolSelect }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // API keys from environment variables
  const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY;
  const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
  const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY;
  const RAPIDAPI_HOST = "apidojo-yahoo-finance-v1.p.rapidapi.com";

  const fetchSymbols = useCallback(async (searchQuery) => {
    setLoading(true);
    setError(null);

    const fetchers = [
      async () => {
        const { data } = await axios.get("https://www.alphavantage.co/query", {
          params: { function: "SYMBOL_SEARCH", keywords: searchQuery, apikey: API_KEY },
          timeout: 5000,
        });
        return (
          data.bestMatches?.map((stock) => ({
            symbol: stock["1. symbol"],
            name: stock["2. name"],
            region: stock["4. region"],
          })) || []
        );
      },
      async () => {
        const { data } = await axios.get(
          "https://apidojo-yahoo-finance-v1.p.rapidapi.com/auto-complete",
          {
            headers: {
              "x-rapidapi-key": RAPIDAPI_KEY,
              "x-rapidapi-host": RAPIDAPI_HOST,
            },
            params: { q: searchQuery, region: "US" },
            timeout: 5000,
          }
        );
        return (
          data.quotes?.map((item) => ({
            symbol: item.symbol,
            name: item.shortname,
            region: item.region || "US",
          })) || []
        );
      },
      async () => {
        const { data } = await axios.get("https://finnhub.io/api/v1/search", {
          params: { q: searchQuery, token: FINNHUB_KEY },
          timeout: 5000,
        });
        return (
          data.result?.map((item) => ({
            symbol: item.symbol,
            name: item.description,
            region: "US",
          })) || []
        );
      },
    ];

    for (const fetcher of fetchers) {
      try {
        const results = await fetcher();
        if (results.length > 0) {
          setSuggestions(results.slice(0, 5));
          setLoading(false);
          return;
        }
      } catch (fetchError) {
        console.warn("Data source failed, trying next...", fetchError);
      }
    }

    setError("No symbol suggestions available at this time.");
    setSuggestions([]);
    setLoading(false);
  }, [API_KEY, RAPIDAPI_KEY, FINNHUB_KEY]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setError(null);
      return;
    }
    const timer = setTimeout(() => fetchSymbols(query.trim()), 500);
    return () => clearTimeout(timer);
  }, [query, fetchSymbols]);

  const handleSelect = (symbolValue) => {
    onSymbolSelect(symbolValue);
    setQuery(symbolValue);
    setSuggestions([]);
  };

  const clearSearch = () => {
    setQuery("");
    setSuggestions([]);
    setError(null);
  };

  const handleKeyPress = (e, symbolValue) => {
    if (e.key === "Enter" || e.key === " ") {
      handleSelect(symbolValue);
    }
  };

  return (
    // Outer container: full width on small devices, auto width on medium+
    <div className="w-full md:w-auto">
      <div className="relative w-full max-w-xs">
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-gray-500" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search stock (e.g., IBM)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-300"
            aria-label="Stock search"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-3 text-gray-500"
              aria-label="Clear search"
            >
              <FaTimes />
            </button>
          )}
          {loading && (
            <FaSyncAlt className="absolute right-8 top-3 animate-spin text-gray-500" aria-hidden="true" />
          )}
        </div>
        {error && (
          <div className="mt-1 text-red-500 text-sm" role="alert">
            {error}
          </div>
        )}
        {suggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 bg-white border rounded-md w-full mt-1 shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((stock, index) => {
              const sym = stock.symbol || `unknown-${index}`;
              const region = stock.region || "unknown-region";
              return (
                <li
                  key={`${sym}-${index}`}
                  role="option"
                  className="p-2 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => handleSelect(sym)}
                  tabIndex={0}
                  onKeyPress={(e) => handleKeyPress(e, sym)}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{sym}</span>
                    <span className="text-gray-600">{region}</span>
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {stock.name || "No name provided"}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {loading && suggestions.length === 0 && <SearchSkeleton />}
      </div>
    </div>
  );
};

SymbolSearchCard.propTypes = {
  onSymbolSelect: PropTypes.func.isRequired,
};

export default SymbolSearchCard;
