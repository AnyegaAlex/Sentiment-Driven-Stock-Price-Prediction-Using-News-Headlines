import ReactGA from 'react-ga4';

export const initAnalytics = () => {
  if (import.meta.env.PROD && import.meta.env.VITE_GA_MEASUREMENT_ID) {
    ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID);
  }
};

export const trackEvent = (category, action, label = null, value = null) => {
  if (import.meta.env.PROD) {
    ReactGA.event({ category, action, label, value });
  } else {
    console.log(`[Analytics] ${category}: ${action}`, { label, value });
  }
};

export const trackPageView = (path) => {
  if (import.meta.env.PROD) {
    ReactGA.send({ hitType: 'pageview', page: path });
  } else {
    console.log(`[Analytics] Pageview: ${path}`);
  }
};