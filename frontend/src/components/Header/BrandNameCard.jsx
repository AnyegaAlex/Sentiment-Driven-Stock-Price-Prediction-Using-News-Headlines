/**
 * BrandNameCard – Displays the application logo and brand name.
 *
 * Features:
 * - Responsive sizing (smaller on mobile)
 * - Optional `onClick` to make the whole card clickable (e.g., navigate home)
 * - Uses `lucide-react` icons for consistency with the rest of the project
 * - Accessible with proper ARIA labels
 * - Supports custom logo via `logoUrl` or falls back to a default icon
 * - Can be wrapped with a Router `Link` via the `asChild` pattern
 */

import React from 'react';
import PropTypes from 'prop-types';
import { ChartPie } from 'lucide-react';
import { cn } from '@/lib/utils';

const BrandNameCard = ({
  brandName = 'StockSentiment AI',
  logoUrl = null,
  className = '',
  onClick = null,
  ariaLabel = `${brandName} – home`,
}) => {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      className={cn(
        'flex items-center gap-2 sm:gap-3 transition-opacity duration-200',
        onClick && 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg',
        className
      )}
      onClick={onClick}
      aria-label={ariaLabel}
      role={onClick ? 'link' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className="w-7 h-7 sm:w-9 md:w-10 object-contain"
          aria-hidden="true"
        />
      ) : (
        <ChartPie
          className="w-7 h-7 sm:w-9 md:w-10 text-blue-600 dark:text-blue-400"
          aria-hidden="true"
        />
      )}
      <span
        className={cn(
          'text-lg sm:text-xl md:text-2xl font-bold',
          'text-gray-800 dark:text-gray-100',
          'whitespace-nowrap'
        )}
      >
        {brandName}
      </span>
    </Wrapper>
  );
};

BrandNameCard.propTypes = {
  /** Display name of the brand */
  brandName: PropTypes.string,
  /** URL of a custom logo image (optional) */
  logoUrl: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Click handler – makes the entire card clickable */
  onClick: PropTypes.func,
  /** Accessible label for screen readers */
  ariaLabel: PropTypes.string,
};

export default BrandNameCard;