// layouts/LandingLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PropTypes from 'prop-types';

const propTypes = {
  /** Additional CSS classes */
  className: PropTypes.string,
};

export const LandingLayout = ({ className = '' }) => {
  return (
    <div 
      className={cn(
        'min-h-screen flex flex-col',
        'bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950',
        className
      )}
    >
      <main className="flex-grow" role="main" aria-label="Landing page content">
        <Outlet />
      </main>
    </div>
  );
};

LandingLayout.propTypes = propTypes;

export default LandingLayout;