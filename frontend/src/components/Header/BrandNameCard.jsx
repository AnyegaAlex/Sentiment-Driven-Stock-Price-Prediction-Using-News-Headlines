// BrandNameCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useDashboard } from '@/context/DashboardContext';
import { cn } from '@/lib/utils';

// Use the white version for dark theme
import TfcLogo from '@/assets/Primary Icon White.svg';

const propTypes = {
  logo: PropTypes.elementType,
  className: PropTypes.string,
  to: PropTypes.string,
  onClearSymbol: PropTypes.func,
  strokeWidth: PropTypes.number,
};

const BrandNameCard = ({
  logo: LogoIcon = TfcLogo,
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
        'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-black rounded-md',
        'transition-opacity hover:opacity-80',
        className
      )}
      aria-label="Tickflow Intelligence – Hybrid LSTM + FinBERT Stock Prediction Platform"
    >
      <img
        src={LogoIcon}
        alt="TFC"
        className="h-9 w-9 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity duration-200"
      />
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-lg font-semibold text-white tracking-tight truncate">
          Tickflow Intelligence
        </span>
        <span className="text-xs font-medium text-gray-400 tracking-wide truncate">
          Hybrid LSTM + FinBERT Stock Intelligence
        </span>
      </div>
    </Link>
  );
};

BrandNameCard.propTypes = propTypes;

export default React.memo(BrandNameCard);