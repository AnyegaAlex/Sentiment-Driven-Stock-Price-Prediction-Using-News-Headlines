/**
 * Sentry configuration for frontend error tracking
 * 
 * Features:
 * - Error tracking with source maps
 * - Performance monitoring (tracing)
 * - User context for errors
 * - Breadcrumbs for user actions
 * - React Router v6 integration
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { createBrowserRouter, useLocation, useNavigationType } from 'react-router-dom';
import { useEffect } from 'react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production';
const SENTRY_RELEASE = import.meta.env.VITE_SENTRY_RELEASE || null;
const SENTRY_TRACES_SAMPLE_RATE = parseFloat(
  import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'
);

/**
 * Initialize Sentry
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.warn('[Sentry] DSN not configured – skipping initialization');
    }
    return null;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      new BrowserTracing({
        // Trace all navigation changes
        tracingOrigins: ['localhost', 'tickflow.com', /^\//],
      }),
    ],
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    release: SENTRY_RELEASE,
    environment: SENTRY_ENVIRONMENT,
    sendDefaultPii: false,
    beforeSend(event) {
      // Remove sensitive data from events
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['X-API-Key'];
      }
      return event;
    },
  });

  // Set global context
  Sentry.setContext('app', {
    name: 'Tickflow Sentiment',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  });

  console.log('[Sentry] Initialized for environment:', SENTRY_ENVIRONMENT);
  return Sentry;
}

/**
 * React Router v6 integration for Sentry
 * Automatically captures route changes as transactions
 */
export function useSentryRouting() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Start a transaction for route changes
    const transaction = Sentry.startTransaction({
      name: `route:${location.pathname}`,
      op: 'navigation',
      metadata: {
        source: 'route',
        navigationType,
      },
    });

    // Set transaction on scope
    Sentry.configureScope((scope) => {
      scope.setSpan(transaction);
    });

    // Finish transaction when component unmounts
    return () => {
      transaction.finish();
    };
  }, [location, navigationType]);
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Capture exception with additional context
 */
export function captureException(error, context = {}) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Add breadcrumb for user actions
 */
export function addSentryBreadcrumb(message, category = 'user', data = {}) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

export default Sentry;