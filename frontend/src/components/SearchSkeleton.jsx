import React from "react";
import PropTypes from "prop-types";

const SearchSkeleton = ({ count = 2 }) => {
  return (
    <div role="status" className="animate-pulse space-y-4">
      <span className="sr-only">Loading search results...</span>
      
      {[...Array(count)].map((_, index) => (
        <div 
          key={index}
          className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"
          aria-hidden="true"
        >
          <div className="space-y-3">
            {/* Title/Header */}
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            
            {/* Content snippet */}
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
            
            {/* Metadata */}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

SearchSkeleton.propTypes = {
  count: PropTypes.number,
};

SearchSkeleton.defaultProps = {
  count: 2,
};

export default SearchSkeleton;