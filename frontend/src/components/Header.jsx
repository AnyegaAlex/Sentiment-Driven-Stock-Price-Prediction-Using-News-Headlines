import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandNameCard from "./Header/BrandNameCard";
import SymbolSearchCard from "./Header/SymbolSearchCard";
import DateSelectorCard from "./Header/DateSelectorCard";
import NavigationCards from "./Header/NavigationCards";
import PropTypes from "prop-types";

const Header = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState({ 
    from: new Date(), 
    to: null 
  });
  
  // updated: Added error handling for symbol selection
  const handleSymbolSelect = (symbol) => {
    try {
      if (!symbol || typeof symbol !== 'string') {
        throw new Error('Invalid symbol selected');
    }
    localStorage.setItem("lastSymbol", symbol);
    navigate(`/dashboard/${encodeURIComponent(symbol)}`);
    } catch (error) {
      console.error('Symbol selection error:', error);
    }
  };

  const navItems = [
    { id: "dashboard", name: "Dashboard Overview", route: "/dashboard", icon: <span role="img" aria-label="dashboard">📊</span> },
    { id: "news-analysis", name: "News Analysis", route: "/news-analysis", icon: <span role="img" aria-label="news">📰</span> },
    { id: "prediction-history", name: "Prediction History", route: "/prediction-history", icon: <span role="img" aria-label="history">⏳</span> },
  ];

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-50">
      <div className="container mx-auto flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <BrandNameCard brandName="Stock Sentiment Dashboard" logoUrl={null} />
          <div className="flex-1 max-w-2xl">
          <SymbolSearchCard onSymbolSelect={handleSymbolSelect} />
          </div>
          <DateSelectorCard dateRange={selectedDate} setDateRange={setSelectedDate} mode="single" />
        </div>
        {/* Navigation Row */}
        <nav aria-label="Main navigation">
          <NavigationCards 
          navItems={navItems}
          className="mt-4"  
        />
        </nav>
      </div>
    </header>
  );
};

Header.propTypes = {

};

export default Header;
