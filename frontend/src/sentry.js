/**
 * Sentry configuration for frontend error tracking and route performance.
 *
 * Sensitive authentication data is removed before events leave the browser.
 */

import * as Sentry from '@sentry/react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import { useEffect } from 'react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production';
const SENTRY_RELEASE = import.meta.env.VITE_SENTRY_RELEASE || null;
const configuredSampleRate = Number.parseFloat(
  import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'
);
const SENTRY_TRACES_SAMPLE_RATE = Number.isFinite(configuredSampleRate)
  ? Math.max(0, Math.min(1, configuredSampleRate))
  : 0.1;

const scrubRequest = (request = {}) => {
  if (request.headers) {
    delete request.headers.Authorization;
    delete request.headers.authorization;
    delete request.headers['X-API-Key'];
    delete request.headers['x-api-key'];
    delete request.headers.Cookie;
    delete request.headers.cookie;
  }

  // Authentication, verification and reset links may contain secrets in query strings.
  if (request.url) {
    try {
      const url = new URL(request.url);
      request.url = `${url.origin}${url.pathname}`;
    } catch {
      request.url = request.url.split('?')[0].split('#')[0];
    }
  }

  // Request bodies may contain passwords, API keys or personal details.
  delete request.data;
  return request;
};

/**
 * Initialize Sentry using the installed Sentry v10 React Router integration.
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.info('[Sentry] DSN not configured. Error reporting is disabled in this environment.');
    }
    return null;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.reactRouterBrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
        tracePropagationTargets: [
          'localhost',
          'tickflowcapital.com',
          /^\/api\//,
        ],
      }),
    ],
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    release: SENTRY_RELEASE,
    environment: SENTRY_ENVIRONMENT,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        event.request = scrubRequest(event.request);
      }
      return event;
    },
  });

  Sentry.setContext('app', {
    name: 'TickFlow Intelligence',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  });

  if (import.meta.env.DEV) {
    console.info('[Sentry] Initialized for environment:', SENTRY_ENVIRONMENT);
  }
  return Sentry;
}

/**
 * Set non-sensitive user context for error grouping.
 * Email addresses are intentionally excluded.
 */
export function setSentryUser(user) {
  if (user) {
    Sentry.setUser({
      id: user.id ? String(user.id) : undefined,
      username: user.username || undefined,
    });
  } else {
    Sentry.setUser(null);
  }
}

export function captureException(error, context = {}) {
  Sentry.captureException(error, { extra: context });
}

export function addSentryBreadcrumb(message, category = 'user', data = {}) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

export default Sentry;
