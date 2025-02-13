import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import NewsAnalysis from "./pages/NewsAnalysis";
import PredictionHistory from "./pages/PredictionHistory";
import ErrorBoundary from "./components/ErrorBoundary";

const App = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("IBM");
  const [newsData, setNewsData] = useState([]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <ErrorBoundary>
          <Header 
            setSymbol={setSelectedSymbol}
            setNewsData={setNewsData}
          />
        </ErrorBoundary>
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
            <Route path="/news-analysis" element={<NewsAnalysis />} />
            <Route path="/prediction-history" element={<PredictionHistory />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
