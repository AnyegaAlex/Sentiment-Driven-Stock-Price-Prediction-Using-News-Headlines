import { createContext, useContext, useState } from "react";
import PropTypes from "prop-types";

const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
  const [stockSymbol, setStockSymbol] = useState("");
  const [newsData, setNewsData] = useState([]);

  return (
    <DashboardContext.Provider value={{ stockSymbol, setStockSymbol, newsData, setNewsData }}>
      {children}
    </DashboardContext.Provider>
  );
};

// ✅ Custom hook for easy context access
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