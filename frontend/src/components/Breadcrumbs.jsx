/**
 * Breadcrumbs Component
 *
 * Displays the current navigation path with clickable links.
 * Uses the global context symbol when on the dashboard page.
 *
 * Features:
 * - Responsive design
 * - Keyboard accessible
 * - Shows current page as active (non-clickable)
 * - Uses global symbol for dashboard breadcrumb
 * - Clean, minimal styling
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { cn } from '@/lib/utils';

/**
 * Route name mapping for display
 */
const ROUTE_NAMES = {
  'dashboard': 'Dashboard',
  'news-analysis': 'News Analysis',
  'prediction-history': 'Prediction History',
};

const Breadcrumbs = () => {
  const location = useLocation();
  const { stockSymbol } = useDashboard();

  // Split path into segments (e.g., '/dashboard/AAPL' → ['dashboard', 'AAPL'])
  const pathSegments = location.pathname.split('/').filter((segment) => segment !== '');

  // If we're at the root, show nothing (or just a home icon)
  if (pathSegments.length === 0) {
    return (
      <nav className="flex items-center gap-1 text-sm text-gray-400 py-2" aria-label="Breadcrumbs">
        <Home className="h-4 w-4" />
      </nav>
    );
  }

  // Build the breadcrumb items
  const items = [];
  let currentPath = '';

  // Always include home as the first item
  items.push({
    label: <Home className="h-4 w-4" />,
    path: '/',
    isHome: true,
  });

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    let displayName = ROUTE_NAMES[segment] || segment;

    // Special handling for dashboard: show the symbol if available
    if (segment === 'dashboard' && stockSymbol && index === pathSegments.length - 1) {
      displayName = stockSymbol.toUpperCase();
    } else if (segment === 'dashboard' && !stockSymbol) {
      displayName = 'Dashboard';
    }

    items.push({
      label: displayName,
      path: currentPath,
      isLast,
    });
  });

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-400 py-2" aria-label="Breadcrumbs">
      {items.map((item, index) => {
        const isLast = item.isLast;
        const isHome = item.isHome;

        return (
          <React.Fragment key={item.path || 'home'}>
            {index > 0 && <ChevronRight className="h-3 w-3 text-gray-600" aria-hidden="true" />}
            {isLast ? (
              <span
                className="text-gray-200 font-medium"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className={cn(
                  'hover:text-gray-200 transition-colors',
                  isHome ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-200'
                )}
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;