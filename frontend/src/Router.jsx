// src/Router.jsx
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewsAnalysis from './pages/NewsAnalysis';
import PredictionHistory from './pages/PredictionHistory';

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/news-analysis" element={<NewsAnalysis />} />
      <Route path="/prediction-history" element={<PredictionHistory />} />
    </Routes>
  );
};

export default AppRouter;