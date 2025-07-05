import React from "react";
import PropTypes from "prop-types";

const NewsSkeleton = ({ count = 3 }) => {
  return (
    <div role="status" className="space-y-4 animate-pulse">
      {/* Visually hidden loading text for screen readers */}
      <span className="sr-only">Loading news articles...</span>
      
      {[...Array(count)].map((_, i) => (
        <div 
          key={i}
          className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
          aria-hidden="true"
        >
          <div className="space-y-4">
            {/* Title */}
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            
            {/* Summary Lines */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
            </div>
            
            {/* Metadata */}
            <div className="flex justify-between pt-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="flex items-center space-x-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
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

export default NewsSkeleton;