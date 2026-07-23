/**
 * Breadcrumbs Component – v2.0.0
 *
 * Displays the current navigation path with clickable links.
 * Uses the global context symbol when on the dashboard page.
 *
 * Features:
 * - Responsive design with Tailwind
 * - Keyboard accessible
 * - Shows current page as active (non-clickable)
 * - Uses global symbol for dashboard breadcrumb
 * - Clean, minimal styling with shadcn/ui
 * - Clears symbol when navigating to dashboard root
 * - Memoized for performance
 *
 * @component
 * @returns {JSX.Element}
 */

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

/**
 * Route name mapping for display
 * Maps URL segments to user-friendly names
 */
const ROUTE_NAMES = {
  dashboard: 'Dashboard',
  'news-analysis': 'News Analysis',
  'prediction-history': 'Prediction History',
  profile: 'Profile',
  settings: 'Settings',
  onboarding: 'Onboarding',
  'verify-email': 'Verify Email',
  login: 'Login',
  register: 'Register',
};

// ============================================================================
// Main Component
// ============================================================================

const Breadcrumbs = () => {
  const location = useLocation();
  const { stockSymbol, setStockSymbol } = useDashboard();

  // Split path into segments (e.g., '/dashboard/AAPL' → ['dashboard', 'AAPL'])
  const pathSegments = useMemo(
    () => location.pathname.split('/').filter((segment) => segment !== ''),
    [location.pathname]
  );

  // Build breadcrumb items
  const items = useMemo(() => {
    const result = [];
    let currentPath = '';

    // Always include home as the first item
    result.push({
      label: <Home className="h-4 w-4" aria-hidden="true" />,
      path: '/',
      isHome: true,
      isLast: pathSegments.length === 0,
    });

    // Build the rest of the path
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      let displayName = ROUTE_NAMES[segment] || segment;

      // Special handling for dashboard
      if (segment === 'dashboard') {
        if (stockSymbol && isLast) {
          displayName = stockSymbol.toUpperCase();
        } else {
          displayName = 'Dashboard';
        }
      }

      result.push({
        label: displayName,
        path: currentPath,
        isLast,
      });
    });

    return result;
  }, [pathSegments, stockSymbol]);

  // If we're at the root, show only the home icon
  if (pathSegments.length === 0) {
    return (
      <nav
        className="flex items-center gap-1 py-2 text-sm text-muted-foreground"
        aria-label="Breadcrumbs"
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Home</span>
      </nav>
    );
  }

  return (
    <nav
      className="flex items-center gap-1 py-2 text-sm text-muted-foreground"
      aria-label="Breadcrumbs"
    >
      {items.map((item, index) => {
        const isLast = item.isLast;

        return (
          <React.Fragment key={item.path || 'home'}>
            {index > 0 && (
              <ChevronRight
                className="h-3 w-3 text-muted-foreground/50"
                aria-hidden="true"
              />
            )}
            {isLast ? (
              <span
                className="font-medium text-foreground"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className={cn(
                  'transition-colors hover:text-foreground',
                  'text-muted-foreground hover:text-foreground'
                )}
                onClick={
                  item.path === '/dashboard'
                    ? () => {
                        // Clear symbol when navigating to dashboard root
                        setStockSymbol(null);
                      }
                    : undefined
                }
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

Breadcrumbs.displayName = 'Breadcrumbs';

export default React.memo(Breadcrumbs);