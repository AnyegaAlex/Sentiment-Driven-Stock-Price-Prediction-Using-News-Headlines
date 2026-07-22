// layouts/AuthLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PropTypes from 'prop-types';

const propTypes = {
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Background gradient override */
  gradient: PropTypes.string,
};

export const AuthLayout = ({ 
  className = '',
  gradient = 'from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950',
}) => {
  return (
    <div 
      className={cn(
        'min-h-screen flex flex-col bg-gradient-to-br',
        gradient,
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