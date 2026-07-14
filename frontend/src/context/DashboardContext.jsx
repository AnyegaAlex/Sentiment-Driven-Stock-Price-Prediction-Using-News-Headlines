import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";

const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
  // Initialize stockSymbol from localStorage
  const [stockSymbol, setStockSymbol] = useState(() => {
    return localStorage.getItem('lastSymbol') || '';
  });
  const [newsData, setNewsData] = useState([]);

  // Persist stockSymbol to localStorage whenever it changes
  useEffect(() => {
    if (stockSymbol) {
      localStorage.setItem('lastSymbol', stockSymbol);
    } else {
      localStorage.removeItem('lastSymbol');
    }
  }, [stockSymbol]);

  return (
    <DashboardContext.Provider value={{ stockSymbol, setStockSymbol, newsData, setNewsData }}>
      {children}
    </DashboardContext.Provider>
  );
};

// Custom hook for easy context access
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};

DashboardProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DashboardContext;