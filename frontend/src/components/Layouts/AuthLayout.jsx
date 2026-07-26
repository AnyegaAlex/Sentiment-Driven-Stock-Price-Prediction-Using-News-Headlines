import React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PropTypes from 'prop-types';

const propTypes = {
  /** Additional CSS classes */
  className: PropTypes.string,
};

export const AuthLayout = ({ 
  className = '',
}) => {
  return (
    <div 
      className={cn(
        'min-h-screen flex flex-col bg-black',
        className
      )}
    >
      <main 
        className="flex-grow flex items-center justify-center px-4"
        role="main"
        aria-label="Authentication page"
      >
        <Outlet />
      </main>
    </div>
  );
};

AuthLayout.propTypes = propTypes;

export default AuthLayout;