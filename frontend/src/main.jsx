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

// Register the offline shell only in production; API and account responses stay network-only.
if (IS_PRODUCTION && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The app remains usable online if optional offline support cannot initialize.
    });
  });
}

// ============================================================
// Enforce Dark Mode
// ============================================================

// Ensure dark mode is always applied
const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.className = 'bg-black text-white';
}

// Add dark class to html element if not already present
if (!document.documentElement.classList.contains('dark')) {
  document.documentElement.classList.add('dark');
}

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);