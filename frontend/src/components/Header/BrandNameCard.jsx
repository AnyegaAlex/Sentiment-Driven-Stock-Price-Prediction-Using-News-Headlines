// BrandNameCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useDashboard } from '@/context/DashboardContext';
import { cn } from '@/lib/utils';

// Use the white version for dark theme
import TfcLogo from '@/assets/TickFlowIntelligenceIcon.svg';

const propTypes = {
  logo: PropTypes.string,
  className: PropTypes.string,
  to: PropTypes.string,
  onClearSymbol: PropTypes.func,
};

const BrandNameCard = ({
  logo: LogoIcon = TfcLogo,
  className = '',
  to = '/dashboard',
  onClearSymbol,
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
        'group flex min-w-0 max-w-full items-center gap-2.5 no-underline',
        'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-black rounded-md',
        'transition-opacity hover:opacity-80',
        className
      )}
      aria-label="TickFlow Intelligence dashboard"
    >
      <img
        src={LogoIcon}
        alt="TFI"
        className="h-9 w-9 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity duration-200"
      />
      <div className="flex flex-col leading-tight min-w-0">
        <span className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
          TickFlow Intelligence
        </span>
        <span className="hidden truncate text-xs font-medium tracking-wide text-gray-400 sm:block">
          Stock research workspace
        </span>
      </div>
    </Link>
  );
};

BrandNameCard.propTypes = propTypes;

export default React.memo(BrandNameCard);