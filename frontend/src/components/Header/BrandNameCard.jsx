// components/BrandNameCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Radar } from 'lucide-react';
import PropTypes from 'prop-types';
import { useDashboard } from '@/context/DashboardContext';
import { cn } from '@/lib/utils';

const propTypes = {
  /** Custom icon component (defaults to Radar) */
  logo: PropTypes.elementType,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Destination URL (defaults to /dashboard) */
  to: PropTypes.string,
  /** Custom click handler (overrides default) */
  onClearSymbol: PropTypes.func,
  /** Icon stroke width */
  strokeWidth: PropTypes.number,
};

const BrandNameCard = ({
  logo: LogoIcon = Radar,
  className = '',
  to = '/dashboard',
  onClearSymbol,
  strokeWidth = 1.8,
}) => {
  const { setStockSymbol } = useDashboard();

  const handleClick = (e) => {
    if (onClearSymbol) {
      onClearSymbol(e);
    } else {
      setStockSymbol(null);
    }
  };

  return (
    <Link
      to={to}
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-2.5 no-underline',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md',
        'transition-opacity hover:opacity-80',
        className
      )}
      aria-label="Tickflow Sentiment – AI-Powered Financial News Intelligence"
    >
      <LogoIcon
        className="h-9 w-9 text-blue-600 dark:text-blue-400 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 flex-shrink-0"
        strokeWidth={strokeWidth}
        aria-hidden="true"
      />
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight truncate">
          Tickflow Sentiment
        </span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide truncate">
          AI-Powered Financial News Intelligence
        </span>
      </div>
    </Link>
  );
};

BrandNameCard.propTypes = propTypes;

export default React.memo(BrandNameCard);