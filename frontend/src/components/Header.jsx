// src/components/Header.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandNameCard from "./Header/BrandNameCard";
import SymbolSearchCard from "./Header/SymbolSearchCard";
import DateSelectorCard from "./Header/DateSelectorCard";
import NavigationCards from "./Header/NavigationCards";

const Header = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState({ from: new Date(), to: null });
  
  // Callback for when a symbol is selected from SymbolSearchCard.
  const handleSymbolSelect = (symbol) => {
    localStorage.setItem("lastSymbol", symbol);
    navigate(`/dashboard/${symbol}`);
  };

  const navItems = [
    { id: "dashboard", name: "Dashboard Overview", route: "/dashboard", icon: <span role="img" aria-label="dashboard">📊</span> },
    { id: "news-analysis", name: "News Analysis", route: "/news-analysis", icon: <span role="img" aria-label="news">📰</span> },
    { id: "prediction-history", name: "Prediction History", route: "/prediction-history", icon: <span role="img" aria-label="history">⏳</span> },
  ];

  return (
    <header className="bg-white shadow-md p-4">
      <div className="container mx-auto flex flex-col gap-4">
        {/* Top Row on larger devices */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <BrandNameCard brandName="Stock Sentiment Dashboard" logoUrl={null} />
          <SymbolSearchCard onSymbolSelect={handleSymbolSelect} />
          <DateSelectorCard dateRange={selectedDate} setDateRange={setSelectedDate} mode="single" />
        </div>
        {/* Navigation Row */}
        <div className="mt-4">
          <NavigationCards navItems={navItems} />
        </div>
      </div>
    </header>
  );
};

export default Header;
