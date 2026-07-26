import React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PropTypes from 'prop-types';

const propTypes = {
  /** Additional CSS classes */
  className: PropTypes.string,
};

export const PublicLayout = ({ className = '' }) => {
  return (
    <div 
      className={cn(
        'min-h-screen flex flex-col bg-black text-white',
        className
      )}
    >
      <main 
        className="flex-grow"
        role="main"
        aria-label="Public content"
      >
        <Outlet />
      </main>
    </div>
  );
};

PublicLayout.propTypes = propTypes;

export default PublicLayout;