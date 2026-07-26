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
      <Info 
        className="w-4 h-4 text-gray-500 hover:text-gray-300 cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
        aria-label="More information"
      />
      {isVisible && (
        <div className={cn(
          'absolute z-50 w-64 p-3 text-sm text-gray-300',
          'bg-gray-900 rounded-lg shadow-lg border border-gray-800',
          positions[position]
        )}>
          {text}
          <div className="absolute w-2 h-2 bg-gray-900 border border-gray-800 transform rotate-45 -z-10" />
        </div>
      )}
    </div>
  );
};

Tooltip.propTypes = propTypes;

export default Tooltip;