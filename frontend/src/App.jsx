/**
 * Production-Ready App Component
 * 
 * Features:
 * - Lazy loading with Suspense for code splitting
 * - Proper route protection with tier-based access
 * - Clean layout management
 * - Theme and analytics integration
 * - Error boundaries
 * - Optimized bundle size
 * 
 * @version 2.0.0
 * @author Tickflow Capital
 */

import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import ReactGA from 'react-ga4';

// ============================================================================
// Lazy Load Components
// ============================================================================

// Layout components (eager)
import Header from "./components/Header";
import Footer from "./components/Footer";
import Breadcrumbs from "./components/Breadcrumbs";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Context providers
import { AuthProvider } from "./context/AuthContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { DashboardProvider, useDashboard } from "./context/DashboardContext";
import { PersistGate } from "./context/PersistGate";

// Lazy load pages for code splitting
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const CheckEmail = lazy(() => import("./pages/CheckEmail"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResendVerification = lazy(() => import("./pages/ResendVerification"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewsAnalysis = lazy(() => import("./pages/NewsAnalysis"));
const PredictionHistory = lazy(() => import("./pages/PredictionHistory"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));

// ============================================================================
// Query Client Configuration
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      placeholderData: (previousData) => previousData,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ============================================================================
// Loading Fallback
// ============================================================================

const PageLoader = () => <LoadingSpinner fullScreen label="Loading page..." />;

// ============================================================================
// Theme Hook
// ============================================================================

function useDeviceThemeClass() {
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    
    const apply = (isDark) => {
      root.classList.toggle("dark", Boolean(isDark));
    };
    
    apply(mq.matches);

    const handler = (e) => apply(e.matches);
    
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
    } else {
      mq.addListener(handler);
    }

    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", handler);
      } else {
        mq.removeListener(handler);
      }
    };
  }, []);
}

// ============================================================================
// Analytics
// ============================================================================

const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.PROD) {
      ReactGA.send({
        hitType: 'pageview',
        page: location.pathname + location.search,
        title: document.title,
      });
    }
  }, [location]);

  return null;
};

// ============================================================================
// Auth Route Check
// ============================================================================

const isAuthRoute = (pathname) => {
  const authRoutes = [
    '/signup',
    '/login',
    '/verify-email',
    '/check-email',
    '/reset-password',
    '/forgot-password',
    '/resend-verification',
    '/privacy',
    '/terms',
    '/onboarding',
    '/unauthorized',
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

  // ✅ Auth routes (no header/footer)
  if (isAuthRoute(location.pathname)) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Suspense fallback={<PageLoader />}>
          <main className="flex-grow flex items-center justify-center px-4">
            <ErrorBoundary>
              <AnalyticsTracker />
              <Routes>
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/check-email" element={<CheckEmail />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/resend-verification" element={<ResendVerification />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute requireVerified={false}>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </ErrorBoundary>
          </main>
        </Suspense>
      </div>
    );
  }

  // ✅ Landing page
  if (location.pathname === '/') {
    return (
      <div className="min-h-screen flex flex-col">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <AnalyticsTracker />
            <Routes>
              <Route path="/" element={<LandingPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    );
  }

  // ✅ Protected routes (full layout)
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
          <Suspense fallback={<PageLoader />}>
            <AnalyticsTracker />
            <Routes>
              {/* Free tier routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requiredTiers={['free', 'pro', 'enterprise']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/:symbol"
                element={
                  <ProtectedRoute requiredTiers={['free', 'pro', 'enterprise']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/news-analysis"
                element={
                  <ProtectedRoute requiredTiers={['free', 'pro', 'enterprise']}>
                    <NewsAnalysis />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/prediction-history"
                element={
                  <ProtectedRoute requiredTiers={['free', 'pro', 'enterprise']}>
                    <PredictionHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute requiredTiers={['free', 'pro', 'enterprise']}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredTiers={['free', 'pro', 'enterprise']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* Pro+ tier routes */}
              <Route
                path="/advanced-analytics"
                element={
                  <ProtectedRoute requiredTiers={['pro', 'enterprise']}>
                    <NewsAnalysis />
                  </ProtectedRoute>
                }
              />

              {/* Enterprise tier routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredTiers={['enterprise']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* 404 Not Found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

// ============================================================================
// Main App
// ============================================================================

const App = () => {
  useDeviceThemeClass();

  // Initialize Google Analytics
  useEffect(() => {
    if (import.meta.env.PROD && import.meta.env.VITE_GA_MEASUREMENT_ID) {
      ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID);
    }
  }, []);

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
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;