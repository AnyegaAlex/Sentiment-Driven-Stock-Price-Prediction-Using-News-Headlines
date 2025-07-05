import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import NewsAnalysis from "./pages/NewsAnalysis";
import PredictionHistory from "./pages/PredictionHistory";
import ErrorBoundary from "./components/ErrorBoundary";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardProvider } from "./context/DashboardContext";
import { PersistGate } from './context/PersistGate';
// updated: Configured QueryClient with default options for better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={300}>
      <Router>
        <DashboardProvider>
          <PersistGate>
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <Header />
              <main className="flex-grow container mx-auto px-4 py-6">
                <ErrorBoundary>
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
          </PersistGate>
        </DashboardProvider>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
