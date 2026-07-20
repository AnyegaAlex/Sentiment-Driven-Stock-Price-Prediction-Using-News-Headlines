import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import ReactGA from 'react-ga4';

// Existing components
import Header from "./components/Header";
import Footer from "./components/Footer";
import Breadcrumbs from "./components/Breadcrumbs";
import ErrorBoundary from "./components/ErrorBoundary";

// Authentication & onboarding
import { AuthProvider } from "./context/AuthContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Public pages
import LandingPage from "./pages/LandingPage";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import CheckEmail from "./pages/CheckEmail";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

// Protected pages
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import NewsAnalysis from "./pages/NewsAnalysis";
import PredictionHistory from "./pages/PredictionHistory";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

// Existing context (for stock symbol)
import { DashboardProvider, useDashboard } from "./context/DashboardContext";
import { PersistGate } from "./context/PersistGate";

// ============================================================================
// Query Client
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      placeholderData: (previousData) => previousData,
    },
  },
});

// ============================================================================
// Theme & Analytics
// ============================================================================

function useDeviceThemeClass() {
  React.useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (isDark) => root.classList.toggle("dark", Boolean(isDark));
    apply(mq.matches);

    const handler = (e) => apply(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);
}

const PageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.PROD) {
      ReactGA.send({ hitType: 'pageview', page: location.pathname + location.search });
    }
  }, [location]);

  return null;
};

// ============================================================================
// Layout Helper – Check if route is auth page (no header/footer)
// ============================================================================

const isAuthRoute = (pathname) => {
  const authRoutes = [
    '/signup',
    '/login',
    '/verify-email',
    '/check-email',
    '/reset-password',
    '/resend-verification',
    '/privacy',
    '/terms',
    '/onboarding',   // <-- Added onboarding – clean layout
  ];
  return authRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );
};

// ============================================================================
// App Content
// ============================================================================

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setStockSymbol } = useDashboard();

  const handleSymbolSelect = (symbol) => {
    if (symbol) {
      setStockSymbol(symbol);
      navigate(`/dashboard/${symbol}`);
    }
  };

  // If we're on an auth page or onboarding, show clean layout without Header/Footer
  if (isAuthRoute(location.pathname)) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <main className="flex-grow flex items-center justify-center px-4">
          <ErrorBoundary>
            <PageTracker />
            <Routes>
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/check-email" element={<CheckEmail />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              {/* Onboarding – protected, no header/footer */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    );
  }

  // If we're on the landing page, show Navbar (not the main Header with search)
  if (location.pathname === '/') {
    return (
      <div className="min-h-screen flex flex-col">
        <ErrorBoundary>
          <PageTracker />
          <Routes>
            <Route path="/" element={<LandingPage />} />
          </Routes>
        </ErrorBoundary>
      </div>
    );
  }

  // All other routes (dashboard, news, history, profile, settings) – show full layout with Header/Footer
  // Note: Onboarding is now excluded from this block because it's handled above.
  return (
    <div className="min-h-screen flex flex-col">
      <Header onSymbolSelect={handleSymbolSelect} />
      <main
        className="flex-grow max-w-[1450px] w-full mx-auto px-5 md:px-8"
        style={{
          paddingTop: 'calc(var(--header-height, 80px) + 1rem)',
          paddingBottom: '2rem',
        }}
      >
        <Breadcrumbs />
        <ErrorBoundary>
          <PageTracker />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/:symbol"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/news-analysis"
              element={
                <ProtectedRoute>
                  <NewsAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prediction-history"
              element={
                <ProtectedRoute>
                  <PredictionHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

// ============================================================================
// App
// ============================================================================

const App = () => {
  useDeviceThemeClass();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <Router>
          <AuthProvider>
            <OnboardingProvider>
              <DashboardProvider>
                <PersistGate>
                  <AppContent />
                </PersistGate>
              </DashboardProvider>
            </OnboardingProvider>
          </AuthProvider>
        </Router>
        <ReactQueryDevtools initialIsOpen={false} />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;