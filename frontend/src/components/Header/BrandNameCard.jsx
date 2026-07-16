import React from 'react';
import { Link } from 'react-router-dom';
import { Radar } from 'lucide-react';
import PropTypes from 'prop-types';   // ← Ensure this is present
import { useDashboard } from '@/context/DashboardContext';
import { cn } from '@/lib/utils';

const propTypes = {
  logo: PropTypes.elementType,
  className: PropTypes.string,
  to: PropTypes.string,
};

const BrandNameCard = ({ 
  logo: LogoIcon = Radar,
  className = '',
  to = '/dashboard',
}) => {
  const { setStockSymbol } = useDashboard();

  const handleClick = () => {
    setStockSymbol(null);
  };

  return (
    <Link
      to={to}
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-2.5 no-underline',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md',
        className
      )}
      aria-label="Tickflow Sentiment – AI-Powered Financial News Intelligence"
    >
      <LogoIcon
        className="h-9 w-9 text-blue-600 dark:text-blue-400 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
          Tickflow Sentiment
        </span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide">
          AI-Powered Financial News Intelligence
        </span>
      </div>
    </Link>
  );
};

BrandNameCard.propTypes = propTypes;

export default BrandNameCard;