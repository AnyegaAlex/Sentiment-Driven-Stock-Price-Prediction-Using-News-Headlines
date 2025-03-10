// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import NewsAnalysis from "./pages/NewsAnalysis";
import PredictionHistory from "./pages/PredictionHistory";
import ErrorBoundary from "./components/ErrorBoundary";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardProvider } from "./context/DashboardContext";  // ✅

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Router>
        <DashboardProvider> {/* ✅ Wrap all routes */}
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <ErrorBoundary>
              <Header />
            </ErrorBoundary>
            <ErrorBoundary>
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/dashboard/:symbol" element={<Dashboard />} />
                  <Route path="/news-analysis" element={<NewsAnalysis />} />
                  <Route path="/prediction-history" element={<PredictionHistory />} />
                </Routes>
              </main>
            </ErrorBoundary>
            <Footer />
          </div>
        </DashboardProvider>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
