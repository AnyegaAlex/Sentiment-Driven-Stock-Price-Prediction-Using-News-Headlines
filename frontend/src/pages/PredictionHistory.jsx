import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/client';
import PredictionSummaryCards from '@/components/PredictionSummaryCards';
import PredictionTable from '@/components/PredictionTable';
import PredictionModal from '@/components/PredictionModal';
import PerformanceChart from '@/components/PerformanceChart';
import DriftAlert from '@/components/DriftAlert';
import { FilterBar } from '@/components/FilterBar';
import { Loader2 } from 'lucide-react';

const fetchPredictions = async ({ symbol, dateRange, outcome, limit, offset }) => {
  const params = new URLSearchParams();
  if (symbol) params.append('symbol', symbol);
  if (dateRange) params.append('date_from', dateRange.from);
  if (dateRange) params.append('date_to', dateRange.to);
  if (outcome) params.append('outcome', outcome);
  params.append('limit', limit);
  params.append('offset', offset);
  const response = await apiClient.get(`/predictions/?${params.toString()}`);
  return response;
};

const fetchPerformance = async (symbol) => {
  const url = symbol ? `/performance/?symbol=${symbol}` : '/performance/';
  const response = await apiClient.get(url);
  return response;
};

const fetchDrift = async () => {
  const response = await apiClient.get('/drift/');
  return response;
};

const PredictionHistory = () => {
  const [symbol, setSymbol] = useState('');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [outcome, setOutcome] = useState('all');
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 25;

  // Queries
  const predictionsQuery = useQuery({
    queryKey: ['predictions', { symbol, dateRange, outcome, page, limit }],
    queryFn: () => fetchPredictions({ symbol, dateRange, outcome, limit, offset: page * limit }),
  });

  const performanceQuery = useQuery({
    queryKey: ['performance', symbol],
    queryFn: () => fetchPerformance(symbol),
  });

  const driftQuery = useQuery({
    queryKey: ['drift'],
    queryFn: fetchDrift,
  });

  const handleRowClick = (prediction) => {
    setSelectedPrediction(prediction);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const { data: predsData, isLoading: predsLoading, error: predsError } = predictionsQuery;
  const { data: perfData, isLoading: perfLoading } = performanceQuery;
  const { data: driftData } = driftQuery;

  const predictions = predsData?.results || [];
  const total = predsData?.total || 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold dark:text-white">Prediction History</h1>

      {/* Drift Alert */}
      {driftData?.drift_detected && (
        <DriftAlert severity={driftData.severity} drop={driftData.drop_percent} />
      )}

      {/* Summary Cards */}
      {perfLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <PredictionSummaryCards data={perfData} />
      )}

      {/* Filter Bar */}
      <FilterBar
        symbol={symbol}
        onSymbolChange={setSymbol}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        outcome={outcome}
        onOutcomeChange={setOutcome}
        availableSymbols={['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA']}
      />

      {/* Performance Chart */}
      <PerformanceChart data={perfData} />

      {/* Prediction Table */}
      {predsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : predsError ? (
        <div className="text-red-500">Error loading predictions</div>
      ) : (
        <PredictionTable
          predictions={predictions}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onRowClick={handleRowClick}
        />
      )}

      {/* Prediction Modal */}
      {selectedPrediction && (
        <PredictionModal
          prediction={selectedPrediction}
          isOpen={isModalOpen}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default PredictionHistory;