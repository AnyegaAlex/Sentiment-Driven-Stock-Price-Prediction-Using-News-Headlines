import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { 
  FaSearch, 
  FaSyncAlt, 
  FaUserCircle, 
  FaCalendarAlt, 
  FaChartLine, 
  FaNewspaper, 
  FaHistory 
} from "react-icons/fa";
import axios from "axios";
import SearchSkeleton from "./SearchSkeleton";

const Header = ({ setSymbol, setNewsData }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState("Today");

  // API keys from environment variables
  const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY;
  const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
  const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY;
  const RAPIDAPI_HOST = "apidojo-yahoo-finance-v1.p.rapidapi.com";

  const activeTab = location.pathname.split("/")[1] || "dashboard";

  // Wrap fetchSymbolsYahoo in useCallback so that it remains stable across renders.
  const fetchSymbolsYahoo = useCallback(async (searchQuery) => {
    try {
      const response = await axios.get(
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
      if (!response.data?.quotes) throw new Error("Invalid API response");
      return response.data.quotes
        .filter((item) => item.symbol && item.shortname)
        .slice(0, 5)
        .map((item) => ({
          symbol: item.symbol,
          name: item.shortname,
          region: item.region,
        }));
    } catch (err) {
      console.error("Yahoo Finance error:", err);
      throw new Error("Yahoo Finance fallback service unavailable");
    }
  }, [RAPIDAPI_KEY, RAPIDAPI_HOST]);

  // Wrap fetchSymbolsFinnhub in useCallback as well.
  const fetchSymbolsFinnhub = useCallback(async (searchQuery) => {
    try {
      const response = await axios.get("https://finnhub.io/api/v1/search", {
        params: { q: searchQuery, token: FINNHUB_KEY },
        timeout: 5000,
      });
      if (response.data?.result) {
        return response.data.result
          .filter((item) => item.symbol && item.description)
          .slice(0, 5)
          .map((item) => ({
            symbol: item.symbol,
            name: item.description,
            region: "US",
          }));
      }
      throw new Error("Invalid Finnhub API response");
    } catch (err) {
      console.error("Finnhub error:", err);
      throw new Error("Finnhub fallback service unavailable");
    }
  }, [FINNHUB_KEY]);

  // Wrap fetchSymbols in useCallback and include the helper functions in the dependency array.
  const fetchSymbols = useCallback(
    async (searchQuery) => {
      try {
        setLoading(true);
        setError(null);
        // Try Alpha Vantage first
        const alphaResponse = await axios.get("https://www.alphavantage.co/query", {
          params: { function: "SYMBOL_SEARCH", keywords: searchQuery, apikey: API_KEY },
          timeout: 5000,
        });
        if (alphaResponse.data?.bestMatches?.length > 0) {
          setSuggestions(
            alphaResponse.data.bestMatches.slice(0, 5).map((stock) => ({
              symbol: stock["1. symbol"],
              name: stock["2. name"],
              region: stock["4. region"],
            }))
          );
          return;
        }
        // Fallback to Yahoo Finance
        try {
          const yahooSuggestions = await fetchSymbolsYahoo(searchQuery);
          if (yahooSuggestions?.length > 0) {
            setSuggestions(yahooSuggestions);
            return;
          }
        } catch (yahooError) {
          console.error("Yahoo Finance search failed:", yahooError);
        }
        // Fallback to Finnhub
        try {
          const finnhubSuggestions = await fetchSymbolsFinnhub(searchQuery);
          if (finnhubSuggestions?.length > 0) {
            setSuggestions(finnhubSuggestions);
            return;
          }
        } catch (finnhubError) {
          console.error("Finnhub search failed:", finnhubError);
        }
        setSuggestions([]);
        setError("No symbol suggestions available at this time.");
      } catch (err) {
        console.error("Search error:", err);
        setError("Symbol search temporarily unavailable");
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [API_KEY, fetchSymbolsYahoo, fetchSymbolsFinnhub]
  );

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        fetchSymbols(query.trim());
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query, fetchSymbols]);

  const handleSymbolSelect = (symbol) => {
    setSymbol(symbol);
    setQuery(symbol);
    setSuggestions([]);
    setNewsData([]); // Clear current news so that NewsList refetches
    localStorage.setItem("lastSymbol", symbol);
  };

  return (
    <header className="bg-white shadow-md p-4 rounded-lg">
      {/* Top Row */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Stock Sentiment Dashboard</h1>
        <div className="flex space-x-4">
          {/* Search Input */}
          <div className="relative w-64">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="Search stock (e.g., IBM)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none text-gray-800"
                aria-label="Stock search"
              />
              {loading && (
                <FaSyncAlt className="absolute right-3 top-3 animate-spin text-gray-500" />
              )}
            </div>
            {error && (
              <div className="absolute top-full mt-1 text-red-500 text-sm">
                {error}
              </div>
            )}
            {suggestions.length > 0 ? (
              <ul
                role="listbox"
                className="absolute z-10 bg-white border rounded-md w-full mt-1 shadow-lg max-h-60 overflow-y-auto"
              >
                {suggestions.map((stock, index) => {
                  const symbol = stock.symbol || `unknown-symbol-${index}`;
                  const region = stock.region || "unknown-region";
                  return (
                    <li
                      key={`${symbol}-${region}-${index}`}
                      role="option"
                      className="p-2 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => handleSymbolSelect(symbol)}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{symbol}</span>
                        <span className="text-gray-600">{region}</span>
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {stock.name || "No name provided"}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : loading ? (
              <SearchSkeleton />
            ) : null}
          </div>
          {/* Calendar Select */}
          <div className="relative">
            <FaCalendarAlt className="absolute left-3 top-3 text-gray-500" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none"
            >
              <option>Today</option>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Year to date</option>
            </select>
          </div>
        </div>
        {/* User & Refresh Buttons */}
        <div className="flex items-center space-x-4">
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => window.location.reload()}
          >
            <FaSyncAlt className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <FaUserCircle className="text-gray-600" size={24} />
          </button>
        </div>
      </div>
      {/* Navigation */}
      <nav className="flex mt-4 border-b">
        {[
          { name: "Dashboard Overview", icon: <FaChartLine />, id: "dashboard" },
          { name: "News Analysis", icon: <FaNewspaper />, id: "news-analysis" },
          { name: "Prediction History", icon: <FaHistory />, id: "prediction-history" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(`/${tab.id}`)}
            className={`flex items-center px-4 py-2 border-b-2 ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            } transition-colors`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </nav>
    </header>
  );
};

Header.propTypes = {
  setSymbol: PropTypes.func.isRequired,
  setNewsData: PropTypes.func.isRequired,
};

export default Header;