import React from 'react';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

const defaultNavItems = [
  { path: '/dashboard', label: 'Dashboard', exact: false },
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
        'flex w-full items-center gap-1 sm:w-auto sm:gap-2',
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
              'flex-1 sm:flex-none px-2 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg transition-colors whitespace-nowrap',
              'min-h-[44px] flex items-center justify-center',
              'hover:bg-gray-800 hover:text-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
              isActive
                ? 'bg-gray-800 text-white'
                : 'text-gray-400',
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