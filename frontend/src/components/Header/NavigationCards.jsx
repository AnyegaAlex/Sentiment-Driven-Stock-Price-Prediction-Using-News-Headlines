// components/NavigationCards.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

const defaultNavItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/news-analysis', label: 'News' },
  { path: '/prediction-history', label: 'History' },
];

const propTypes = {
  /** Navigation items array */
  items: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      /** Additional className for this nav item */
      className: PropTypes.string,
      /** Whether to use exact matching */
      exact: PropTypes.bool,
    })
  ),
  /** Additional CSS classes for the nav container */
  className: PropTypes.string,
  /** Callback when navigation occurs */
  onNavigate: PropTypes.func,
};

const NavigationCards = ({
  items = defaultNavItems,
  className = '',
  onNavigate,
}) => {
  const handleClick = (path, event) => {
    if (onNavigate) {
      onNavigate(path, event);
    }
  };

  return (
    <nav
      className={cn(
        'flex flex-wrap items-center gap-1 sm:gap-2',
        className
      )}
      aria-label="Main navigation"
    >
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.exact !== false}
          className={({ isActive }) =>
            cn(
              'px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg transition-colors',
              'min-h-[44px] min-w-[44px] flex items-center justify-center',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              isActive
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300',
              item.className
            )
          }
          aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
          onClick={(e) => handleClick(item.path, e)}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};

NavigationCards.propTypes = propTypes;

export default React.memo(NavigationCards);