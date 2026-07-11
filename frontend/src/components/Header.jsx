import React, { useEffect, useRef } from 'react';
import BrandNameCard from './Header/BrandNameCard';
import NavigationCards from './Header/NavigationCards';
import SymbolSearchCard from './Header/SymbolSearchCard';
import DateSelectorCard from './Header/DateSelectorCard';

const Header = ({ onSymbolSelect, date, onDateSelect }) => {
  const headerRef = useRef(null);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800"
    >
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-3 gap-2 sm:gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <BrandNameCard />
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-end">
            <NavigationCards />
            {/* ✅ Pass the onSymbolSelect prop to SymbolSearchCard */}
            <SymbolSearchCard onSymbolSelect={onSymbolSelect} />
            <DateSelectorCard setDateRange={onDateSelect} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;