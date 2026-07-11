import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import NewsAnalysis from "./pages/NewsAnalysis";
import PredictionHistory from "./pages/PredictionHistory";
import ErrorBoundary from "./components/ErrorBoundary";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { DashboardProvider, useDashboard } from "./context/DashboardContext";
import { PersistGate } from "./context/PersistGate";
import ReactGA from 'react-ga4';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

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

// Page tracker for GA
const PageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.PROD) {
      ReactGA.send({ hitType: 'pageview', page: location.pathname + location.search });
    }
  }, [location]);

  return null;
};

// App content – placed inside Router so useNavigate and context work
const AppContent = () => {
  const navigate = useNavigate();
  const { setStockSymbol } = useDashboard(); // ✅ get setter from context

  // Handler for symbol selection from header search
  const handleSymbolSelect = (symbol) => {
    if (symbol) {
      setStockSymbol(symbol); // ✅ update global context
      navigate(`/dashboard/${symbol}`);
    }
  };

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
        <ErrorBoundary>
          <PageTracker />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/:symbol" element={<Dashboard />} />
            <Route path="/news-analysis" element={<NewsAnalysis />} />
            <Route path="/prediction-history" element={<PredictionHistory />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  useDeviceThemeClass();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <Router>
          <DashboardProvider>
            <PersistGate>
              <AppContent />
            </PersistGate>
          </DashboardProvider>
        </Router>
        <ReactQueryDevtools initialIsOpen={false} />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;