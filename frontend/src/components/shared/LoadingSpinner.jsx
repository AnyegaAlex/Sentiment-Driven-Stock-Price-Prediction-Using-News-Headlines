// components/shared/LoadingSpinner.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

const propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  color: PropTypes.oneOf(['blue', 'gray', 'white', 'primary']),
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  label: PropTypes.string,
  fullScreen: PropTypes.bool,
  show: PropTypes.bool,
  customColor: PropTypes.string,
};

const LoadingSpinner = ({
  size = 'md',
  color = 'blue',
  className = '',
  containerClassName = '',
  label = '',
  fullScreen = false,
  show = true,
  customColor = '',
}) => {
  if (!show) return null;

  const sizeMap = {
    sm: { width: '16px', height: '16px', borderWidth: '2px' },
    md: { width: '32px', height: '32px', borderWidth: '3px' },
    lg: { width: '48px', height: '48px', borderWidth: '4px' },
    xl: { width: '64px', height: '64px', borderWidth: '4px' },
  };

  const colorMap = {
    blue: '#3b82f6',
    gray: '#6b7280',
    white: '#ffffff',
    primary: '#3b82f6',
  };

  const borderColor = customColor || colorMap[color] || colorMap.blue;
  const sizeStyle = sizeMap[size] || sizeMap.md;

  // ✅ Inline styles - guaranteed to work
  const spinnerStyle = {
    width: sizeStyle.width,
    height: sizeStyle.height,
    border: `${sizeStyle.borderWidth} solid ${borderColor}`,
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  };

  const spinner = (
    <div
      style={spinnerStyle}
      className={className}
      role="status"
      aria-label={label || 'Loading'}
    >
      <span className="sr-only">{label || 'Loading'}</span>
    </div>
  );

  const content = label ? (
    <div className="flex flex-col items-center gap-3">
      {spinner}
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  ) : (
    spinner
  );

  if (fullScreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm',
          containerClassName
        )}
        role="dialog"
        aria-modal="true"
        aria-label={label || 'Loading'}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex justify-center items-center py-8',
        containerClassName
      )}
    >
      {content}
    </div>
  );
};

LoadingSpinner.propTypes = propTypes;

export default React.memo(LoadingSpinner);