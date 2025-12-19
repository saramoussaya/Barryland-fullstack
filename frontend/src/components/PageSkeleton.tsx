import React from 'react';

const PageSkeleton: React.FC = () => {
  return (
    <div className="p-8">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );
};

export default PageSkeleton;
