const CONSENT_STORAGE_KEY = 'tickflow_consent_v1';
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const IS_PRODUCTION = import.meta.env.PROD;

let scriptRequested = false;

const hasAnalyticsConsent = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) || 'null');
    return stored?.analytics === true;
  } catch {
    return false;
  }
};

export const initializeConsentMode = () => {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  if (!window.__tickflowConsentDefaultSet) {
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      personalization_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
      wait_for_update: 500,
    });
    window.__tickflowConsentDefaultSet = true;
  }
};

export const initializeAnalytics = () => {
  if (!IS_PRODUCTION || !GA_MEASUREMENT_ID || scriptRequested || typeof document === 'undefined') {
    return false;
  }

  initializeConsentMode();
  scriptRequested = true;

  // Queue the config before the async library arrives. No pageview is sent automatically.
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });

  const script = document.createElement('script');
  script.id = 'tickflow-google-analytics';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  script.onerror = () => {
    scriptRequested = false;
    script.remove();
    console.warn('[Analytics] Could not load Google Analytics. The app will continue without analytics.');
  };
  document.head.appendChild(script);
  return true;
};

const clearAnalyticsCookies = () => {
  if (typeof document === 'undefined') return;
  const analyticsCookies = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter((name) => name === '_ga' || name.startsWith('_ga_'));

  analyticsCookies.forEach((name) => {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.tickflowcapital.com; SameSite=Lax`;
  });
};

export const updateAnalyticsConsent = (enabled) => {
  initializeConsentMode();
  window.gtag('consent', 'update', {
    analytics_storage: enabled ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    personalization_storage: 'denied',
  });

  if (enabled) {
    initializeAnalytics();
  } else {
    clearAnalyticsCookies();
  }
};

export const trackPageView = (path) => {
  if (!IS_PRODUCTION || !hasAnalyticsConsent() || !scriptRequested || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: document.title,
    page_location: `${window.location.origin}${path}`,
  });
};

export const trackEvent = (category, action, label = null, value = null) => {
  if (!IS_PRODUCTION || !hasAnalyticsConsent() || !scriptRequested || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', action, {
    event_category: category,
    ...(label ? { event_label: label } : {}),
    ...(Number.isFinite(value) ? { value } : {}),
  });
};
