// components/Header.jsx
import React, { useEffect, useRef } from 'react';
import BrandNameCard from './Header/BrandNameCard';
import NavigationCards from './Header/NavigationCards';
import SymbolSearchCard from './Header/SymbolSearchCard';
import DateSelectorCard from './Header/DateSelectorCard';
import UserMenu from './Header/UserMenu';

const Header = ({ onSymbolSelect, date, onDateSelect }) => {
  const headerRef = useRef(null);

  // Update CSS variable for header height
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
        {/* 
          Responsive layout using flex + wrap:
          - Mobile: two rows (brand+user on top, others below)
          - Tablet/Desktop: single row with all items aligned
        */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-3 gap-2 sm:gap-3">
          {/* Row 1 (mobile) / Left part (desktop) */}
          <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
            <BrandNameCard />
            {/* UserMenu visible on mobile (right side) */}
            <div className="sm:hidden">
              <UserMenu />
            </div>
          </div>

          {/* Row 2 (mobile) / Right part (desktop) */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Navigation – visible on all screens */}
            <div className="flex-shrink-0">
              <NavigationCards />
            </div>

            {/* Search – full width on mobile, auto on larger */}
            <div className="flex-1 sm:flex-none min-w-[120px] sm:min-w-[180px]">
              <SymbolSearchCard onSymbolSelect={onSymbolSelect} />
            </div>

            {/* Date picker – auto width */}
            <div className="flex-shrink-0">
              <DateSelectorCard setDateRange={onDateSelect} />
            </div>

            {/* UserMenu – hidden on mobile (already shown above), visible on desktop */}
            <div className="hidden sm:block">
              <UserMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;