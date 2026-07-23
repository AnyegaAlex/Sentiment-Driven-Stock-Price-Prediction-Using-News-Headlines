/**
 * NewsSkeleton – Loading skeleton for news articles
 *
 * Features:
 * - Accessible (sr-only loading text)
 * - Image placeholder
 * - Random widths for realism
 *
 * @component
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Skeleton } from '@/components/ui/skeleton';

const NewsSkeleton = ({ count = 3 }) => {
  // Generate random widths for realistic skeleton
  const randomWidth = () => {
    const widths = ['w-3/4', 'w-5/6', 'w-2/3', 'w-4/5', 'w-full'];
    return widths[Math.floor(Math.random() * widths.length)];
  };

  return (
    <div role="status" className="animate-pulse space-y-4">
      <span className="sr-only">Loading news articles...</span>

      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800" aria-hidden="true">
          <div className="space-y-4">
            {/* Image skeleton */}
            <Skeleton className="h-40 w-full rounded-md bg-gray-200 dark:bg-gray-700" />

            {/* Title skeleton */}
            <Skeleton className={`h-6 ${randomWidth()} bg-gray-200 dark:bg-gray-700`} />

            {/* Summary lines */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
              <Skeleton className={`h-4 ${randomWidth()} bg-gray-200 dark:bg-gray-700`} />
              <Skeleton className={`h-4 ${randomWidth()} bg-gray-200 dark:bg-gray-700`} />
            </div>

            {/* Metadata */}
            <div className="flex justify-between pt-2">
              <Skeleton className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-16 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-3 w-12 bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

NewsSkeleton.propTypes = {
  count: PropTypes.number,
};

NewsSkeleton.defaultProps = {
  count: 3,
};

NewsSkeleton.displayName = 'NewsSkeleton';

export default NewsSkeleton;