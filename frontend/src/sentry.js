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
const SENTRY_ENABLE_IN_DEV = import.meta.env.VITE_SENTRY_ENABLE_IN_DEV === 'true';
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT ||
  (import.meta.env.DEV ? 'development' : 'production');
const SENTRY_RELEASE = import.meta.env.VITE_SENTRY_RELEASE || null;
const configuredSampleRate = Number.parseFloat(
  import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'
);
const SENTRY_TRACES_SAMPLE_RATE = Number.isFinite(configuredSampleRate)
  ? Math.max(0, Math.min(1, configuredSampleRate))
  : 0.1;

const SENSITIVE_KEYS = new Set([
  'authorization', 'cookie', 'set-cookie', 'password', 'passwd',
  'token', 'access_token', 'refresh_token', 'api_key', 'apikey',
  'secret', 'email', 'username', 'user_id', 'ip', 'ip_address',
  'remote_addr', 'x-forwarded-for', 'x-real-ip', 'user_agent',
]);

const scrubSensitiveText = (value) => String(value)
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
  .replace(/\b(Bearer|Basic)\s+[A-Z0-9._~+/=-]{8,}/gi, '$1 [REDACTED]')
  .replace(/([?&](?:token|access_token|refresh_token|api_key|apikey|secret|password|code|email)=)[^&#\s]+/gi, '$1[REDACTED]');

const scrubSensitiveValue = (value, depth = 0) => {
  if (depth > 20) return '[REDACTED]';
  if (typeof value === 'string') return scrubSensitiveText(value);
  if (Array.isArray(value)) return value.map((item) => scrubSensitiveValue(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase())
        ? '[REDACTED]'
        : scrubSensitiveValue(item, depth + 1),
    ]));
  }
  return value;
};

const scrubRequest = (request = {}) => {
  const safeRequest = scrubSensitiveValue(request);
  if (safeRequest.url) {
    try {
      const url = new URL(safeRequest.url);
      safeRequest.url = `${url.origin}${url.pathname}`;
    } catch {
      safeRequest.url = safeRequest.url.split('?')[0].split('#')[0];
    }
  }

  // Request bodies may contain credentials, account details or financial profile data.
  delete safeRequest.data;
  delete safeRequest.cookies;
  delete safeRequest.query_string;
  return safeRequest;
};

export function scrubSentryEvent(event) {
  if (!event || typeof event !== 'object') return event;
  const safeEvent = scrubSensitiveValue(event);
  // Do not send Sentry's structured user identity, even when a caller sets it.
  delete safeEvent.user;
  if (safeEvent.request) safeEvent.request = scrubRequest(safeEvent.request);
  return safeEvent;
};

/**
 * Initialize Sentry using the installed Sentry v10 React Router integration.
 */
export function initSentry() {
  // Do not send local Vite traffic into the production Sentry project.
  // Local capture requires an explicit opt-in and a dedicated development DSN.
  if (import.meta.env.DEV && !SENTRY_ENABLE_IN_DEV) {
    return null;
  }

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
      return scrubSentryEvent(event);
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
 * Clear user context. Account identifiers and profile attributes are not sent.
 */
export function setSentryUser() {
  // User-level identifiers are intentionally excluded from Sentry events.
  Sentry.setUser(null);
}

export function captureException(error, context = {}) {
  Sentry.captureException(error, { extra: scrubSensitiveValue(context) });
}

export function addSentryBreadcrumb(message, category = 'user', data = {}) {
  Sentry.addBreadcrumb({
    message: scrubSensitiveText(message),
    category,
    data: scrubSensitiveValue(data),
    level: 'info',
  });
}

export default Sentry;
