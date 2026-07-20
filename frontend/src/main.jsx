import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initSentry } from './sentry';
import ReactGA from 'react-ga4';

// ============================================================
// Environment Configuration
// ============================================================

const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEVELOPMENT = import.meta.env.DEV;
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// ============================================================
// Initialize Sentry (Error Tracking)
// ============================================================

try {
  initSentry();
  if (IS_DEVELOPMENT) {
    console.log('[Sentry] Initialized successfully');
  }
} catch (error) {
  console.warn('[Sentry] Failed to initialize:', error.message);
}

// ============================================================
// Initialize Google Analytics (Production Only)
// ============================================================

if (IS_PRODUCTION && GA_MEASUREMENT_ID) {
  try {
    ReactGA.initialize(GA_MEASUREMENT_ID, {
      gaOptions: {
        cookieFlags: 'SameSite=None; Secure',
      },
    });
    console.log('[Analytics] Google Analytics initialized');
  } catch (error) {
    console.warn('[Analytics] Failed to initialize:', error.message);
  }
} else if (IS_PRODUCTION && !GA_MEASUREMENT_ID) {
  console.warn('[Analytics] GA_MEASUREMENT_ID not configured');
} else if (IS_DEVELOPMENT) {
  console.log('[Analytics] Google Analytics disabled in development');
}

// ============================================================
// Render Application
// ============================================================

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);