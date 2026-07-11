import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/news-analysis', label: 'News' },
  { path: '/prediction-history', label: 'History' },
];

const NavigationCards = () => {
  return (
    <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              'px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg transition-colors',
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              isActive
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300'
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default NavigationCards;