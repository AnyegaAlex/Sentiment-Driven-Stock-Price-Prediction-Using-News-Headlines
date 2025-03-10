import { createContext, useState } from "react";
import PropTypes from "prop-types";

const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
  const [stockSymbol, setStockSymbol] = useState("IBM");
  const [newsData, setNewsData] = useState([]);

  return (
    <DashboardContext.Provider value={{ stockSymbol, setStockSymbol, newsData, setNewsData }}>
      {children}
    </DashboardContext.Provider>
  );
};

DashboardProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DashboardContext;
