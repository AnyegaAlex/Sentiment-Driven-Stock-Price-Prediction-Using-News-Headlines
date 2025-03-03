// src/App.jsx
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import NewsAnalysis from "./pages/NewsAnalysis";
import PredictionHistory from "./pages/PredictionHistory";
import ErrorBoundary from "./components/ErrorBoundary";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a QueryClient instance
const queryClient = new QueryClient();

const App = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("IBM");
  const [newsData, setNewsData] = useState([]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Wrapping the header in an ErrorBoundary */}
            <ErrorBoundary>
              <Header setSymbol={setSelectedSymbol} setNewsData={setNewsData} />
            </ErrorBoundary>
            {/* Wrapping main content in ErrorBoundary to catch route-level errors */}
            <ErrorBoundary>
              <main className="flex-grow">
                <Routes>
                  <Route
                    path="/"
                    element={
                      <Dashboard
                        stockSymbol={selectedSymbol}
                        newsData={newsData}
                        setNewsData={setNewsData}
                      />
                    }
                  />
                  {/* Static dashboard route */}
                  <Route
                    path="/dashboard"
                    element={
                      <Dashboard
                        stockSymbol={selectedSymbol}
                        newsData={newsData}
                        setNewsData={setNewsData}
                      />
                    }
                  />
                  {/* Dynamic dashboard route */}
                  <Route
                    path="/dashboard/:symbol"
                    element={
                      <Dashboard
                        newsData={newsData}
                        setNewsData={setNewsData}
                      />
                    }
                  />
                  <Route path="/news-analysis" element={<NewsAnalysis />} />
                  <Route path="/prediction-history" element={<PredictionHistory />} />
                </Routes>
              </main>
            </ErrorBoundary>
            <Footer />
          </div>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
