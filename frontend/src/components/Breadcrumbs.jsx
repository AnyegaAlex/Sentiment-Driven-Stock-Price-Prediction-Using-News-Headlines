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
  const { setStockSymbol } = useDashboard();

  // Split path into segments (e.g., '/dashboard/AAPL' → ['dashboard', 'AAPL'])
  const pathSegments = useMemo(
    () => location.pathname.split('/').filter((segment) => segment !== ''),
    [location.pathname]
  );

  // Build breadcrumb items
  const items = useMemo(() => {
    const result = [];
    let currentPath = '';

    // In the authenticated application, Home means the dashboard, not the public landing page.
    const isDashboardRoot =
      pathSegments.length === 1 && pathSegments[0] === 'dashboard';

    result.push({
      label: <Home className="h-4 w-4" aria-hidden="true" />,
      path: '/dashboard',
      isHome: true,
      isLast: isDashboardRoot,
    });

    if (isDashboardRoot) return result;

    // Build the rest of the path
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      if (segment === 'dashboard') return;

      const isLast = index === pathSegments.length - 1;
      let displayName = ROUTE_NAMES[segment] || segment;

      result.push({
        label: displayName,
        path: currentPath,
        isLast,
      });
    });

    return result;
  }, [pathSegments]);

  // If we're at the root, show only the home icon
  if (pathSegments.length === 0) {
    return (
      <nav
        className="flex items-center gap-1 py-2 text-sm text-gray-400"
        aria-label="Breadcrumbs"
      >
        <Home className="h-4 w-4 text-gray-400" aria-hidden="true" />
        <span className="sr-only">Home</span>
      </nav>
    );
  }

  return (
    <nav
      className="flex items-center gap-1 py-2 text-sm text-gray-400"
      aria-label="Breadcrumbs"
    >
      {items.map((item, index) => {
        const isLast = item.isLast;

        return (
          <React.Fragment key={item.path || 'home'}>
            {index > 0 && (
              <ChevronRight
                className="h-3 w-3 text-gray-500"
                aria-hidden="true"
              />
            )}
            {isLast ? (
              <span
                className="font-medium text-white"
                aria-current="page"
                aria-label={item.isHome ? 'Dashboard' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                aria-label={item.isHome ? 'Go to dashboard' : undefined}
                className={cn(
                  'min-h-[44px] inline-flex items-center rounded px-2 transition-colors duration-150',
                  'text-gray-300 hover:text-cyan-200 hover:underline hover:decoration-2 hover:underline-offset-4 active:text-cyan-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded'
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