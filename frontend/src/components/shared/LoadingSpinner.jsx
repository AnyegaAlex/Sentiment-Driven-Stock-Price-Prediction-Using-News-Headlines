import React from 'react';
import { cn } from '@/lib/utils';

export const LoadingSpinner = ({ className, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex justify-center items-center py-8">
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-t-transparent border-blue-600 dark:border-blue-400',
          sizeClasses[size],
          className
        )}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
};