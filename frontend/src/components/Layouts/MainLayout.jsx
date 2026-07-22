// layouts/MainLayout.jsx
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../Header';
import Footer from '../Footer';
import Breadcrumbs from '../Breadcrumbs';
import { cn } from '@/lib/utils';
import PropTypes from 'prop-types';

const propTypes = {
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Whether to show breadcrumbs */
  showBreadcrumbs: PropTypes.bool,
  /** Custom header height (for padding calculation) */
  headerHeight: PropTypes.string,
};

export const MainLayout = ({ 
  className = '',
  showBreadcrumbs = true,
  headerHeight = '80px',
}) => {
  const [headerHeightValue, setHeaderHeightValue] = useState(headerHeight);

  // Measure actual header height
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) {
      const height = header.offsetHeight;
      setHeaderHeightValue(`${height}px`);
    }
  }, []);

  return (
    <div 
      className={cn(
        'min-h-screen flex flex-col',
        className
      )}
    >
      <Header />
      <main
        className="flex-grow max-w-[1450px] w-full mx-auto px-5 md:px-8"
        style={{
          paddingTop: `calc(${headerHeightValue} + 1rem)`,
          paddingBottom: '2rem',
        }}
        role="main"
        aria-label="Main content"
      >
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg"
        >
          Skip to main content
        </a>
        <div id="main-content">
          {showBreadcrumbs && <Breadcrumbs className="mb-4" />}
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
};

MainLayout.propTypes = propTypes;

export default MainLayout;