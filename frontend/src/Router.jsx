import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LoadingSpinner from './components/ui/LoadingSpinner';

// updated: Using lazy loading for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NewsAnalysis = lazy(() => import('./pages/NewsAnalysis'));
const PredictionHistory = lazy(() => import('./pages/PredictionHistory'));

const AppRouter = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:symbol" element={<Dashboard />} />
        <Route path="/news-analysis" element={<NewsAnalysis />} />
        <Route path="/prediction-history" element={<PredictionHistory />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;