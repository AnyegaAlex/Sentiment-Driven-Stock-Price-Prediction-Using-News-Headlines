import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { initializeConsentMode, updateAnalyticsConsent, trackPageView } from '@/utils/analytics';

const STORAGE_KEY = 'tickflow_consent_v1';

const readPreferences = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored || typeof stored.analytics !== 'boolean') return null;
    return { necessary: true, analytics: stored.analytics };
  } catch {
    return null;
  }
};

const ConsentManager = () => {
  const [preferences, setPreferences] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    initializeConsentMode();
    const saved = readPreferences();
    setPreferences(saved);
    setAnalyticsEnabled(saved?.analytics === true);
    setShowBanner(!saved);

    if (saved) {
      updateAnalyticsConsent(saved.analytics);
      if (saved.analytics) trackPageView(window.location.pathname);
    }

    const openSettings = () => {
      setShowBanner(false);
      setAnalyticsEnabled(readPreferences()?.analytics === true);
      setShowSettings(true);
    };
    window.addEventListener('tickflow:open-consent-settings', openSettings);
    return () => window.removeEventListener('tickflow:open-consent-settings', openSettings);
  }, []);

  const savePreferences = useCallback((analytics) => {
    const next = { necessary: true, analytics, updatedAt: new Date().toISOString() };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the current page usable when browser storage is unavailable.
    }
    setPreferences(next);
    setShowBanner(false);
    setShowSettings(false);
    updateAnalyticsConsent(analytics);
    if (analytics) trackPageView(window.location.pathname);
  }, []);

  const openSettings = () => {
    setAnalyticsEnabled(preferences?.analytics === true);
    setShowBanner(false);
    setShowSettings(true);
  };

  return (
    <>
      {showBanner && (
        <aside
          className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-4xl rounded-xl border border-gray-700 bg-gray-950 p-5 shadow-2xl sm:inset-x-6 sm:bottom-6"
          aria-label="Cookie preferences"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-base font-semibold text-white">Your privacy choices</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-300">
                TickFlow uses essential storage to keep the service working. With your permission, we also use Google Analytics to understand how the site is used. You can change this choice at any time.
                {' '}<Link to="/privacy" className="underline underline-offset-2 hover:text-white">Privacy policy</Link>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <button type="button" onClick={() => savePreferences(false)} className="min-h-[42px] rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800">
                Reject optional
              </button>
              <button type="button" onClick={openSettings} className="min-h-[42px] rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800">
                Customize
              </button>
              <button type="button" onClick={() => savePreferences(true)} className="min-h-[42px] rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-gray-200">
                Accept all
              </button>
            </div>
          </div>
        </aside>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-settings-title"
            className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-950 p-6 shadow-2xl"
          >
            <h2 id="consent-settings-title" className="text-lg font-semibold text-white">Privacy preferences</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Choose whether TickFlow may use optional analytics. Essential storage is always active because it supports core site functions and security.
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-gray-800 pb-4">
                <div>
                  <h3 className="text-sm font-medium text-white">Essential storage</h3>
                  <p className="mt-1 text-xs text-gray-400">Required for core functionality and security. Always active.</p>
                </div>
                <span className="rounded-full border border-gray-700 px-2 py-1 text-xs text-gray-400">Required</span>
              </div>
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium text-white">Analytics</span>
                  <span className="mt-1 block text-xs text-gray-400">Allows Google Analytics to collect usage information so we can understand and improve the service.</span>
                </span>
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(event) => setAnalyticsEnabled(event.target.checked)}
                  className="mt-1 h-5 w-5 accent-white"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setShowSettings(false); if (!preferences) setShowBanner(true); }} className="min-h-[42px] rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                Cancel
              </button>
              <button type="button" onClick={() => savePreferences(analyticsEnabled)} className="min-h-[42px] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200">
                Save preferences
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default ConsentManager;
