import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import NotFound from './components/NotFound';

// Lazy-loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NewsAnalysis = lazy(() => import('./pages/NewsAnalysis'));
const PredictionHistory = lazy(() => import('./pages/PredictionHistory'));

// Simple fallback (no external dependency)
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
  </div>
);

const AppRouter = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:symbol" element={<Dashboard />} />
        <Route path="/news-analysis" element={<NewsAnalysis />} />
        <Route path="/prediction-history" element={<PredictionHistory />} />
        {/* 404 catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;