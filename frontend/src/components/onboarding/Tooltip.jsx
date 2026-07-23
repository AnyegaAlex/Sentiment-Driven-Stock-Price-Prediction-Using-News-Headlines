// components/onboarding/Tooltip.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const propTypes = {
  text: PropTypes.string.isRequired,
  className: PropTypes.string,
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
};

const Tooltip = ({ text, className = '', position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!text) return null;

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help" />
      {isVisible && (
        <div className={cn(
          'absolute z-50 w-64 p-3 text-sm text-gray-700 dark:text-gray-300',
          'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
          positions[position]
        )}>
          {text}
          <div className="absolute w-2 h-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transform rotate-45 -z-10" />
        </div>
      )}
    </div>
  );
};

Tooltip.propTypes = propTypes;

export default Tooltip;