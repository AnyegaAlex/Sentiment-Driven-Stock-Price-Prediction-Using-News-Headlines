import React from "react";

const NewsSkeleton = () => (
  <div role="status" className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="p-6 bg-white rounded-lg shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/5"></div>
          </div>
        </div>
      </div>
    ))}
    {/* Visually hidden loading text for screen readers */}
    <span className="sr-only">Loading news...</span>
  </div>
);

export default NewsSkeleton;
