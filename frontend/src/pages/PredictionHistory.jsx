/**
 * PredictionHistory Page
 *
 * Displays historical predictions with:
 * - Summary statistics
 * - Interactive table with sortable columns
 * - Mobile-friendly card view
 * - Detailed modal on row click (custom implementation)
 */

import React, { useState } from 'react';
import { usePredictionHistoryQuery } from '@/hooks/queries/usePredictionHistoryQuery';
import PredictionHistoryList from '@/components/charts/PredictionHistoryList';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const PredictionHistory = () => {
  const { data, isLoading, error, refetch } = usePredictionHistoryQuery();
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Normalize data: ensure array
  const predictions = React.useMemo(() => {
    if (Array.isArray(data)) return data;
    if (data?.results) return data.results;
    return [];
  }, [data]);

  const handleRowClick = (prediction) => {
    setSelectedPrediction(prediction);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPrediction(null);
  };

  // Modal overlay click handler (close on backdrop click)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">Prediction History</h1>

      <PredictionHistoryList
        predictions={predictions}
        isLoading={isLoading}
        error={error?.message}
        onRetry={refetch}
        onRowClick={handleRowClick}
        itemsPerPage={10}
        showPagination
        emptyMessage="No predictions have been recorded yet. Start making predictions to see them here."
      />

      {/* Custom Modal */}
      {isModalOpen && selectedPrediction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-200 dark:border-gray-700">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>

            <h2 id="modal-title" className="text-2xl font-bold mb-1 dark:text-white">
              Prediction Details
              <span className="ml-3 text-sm font-normal text-gray-400">
                {selectedPrediction.stock_symbol || selectedPrediction.symbol || 'Unknown'}
              </span>
            </h2>

            {selectedPrediction.headline && (
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {selectedPrediction.headline}
              </p>
            )}

            <div className="space-y-4">
              {/* Date & Source */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                  <p className="font-medium dark:text-white">
                    {selectedPrediction.date
                      ? new Date(selectedPrediction.date).toLocaleString()
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Source</p>
                  <p className="font-medium dark:text-white">
                    {selectedPrediction.source || '—'}
                  </p>
                </div>
              </div>

              {/* Movement & Confidence */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Predicted Movement</p>
                  <Badge
                    className={
                      selectedPrediction.predicted_movement === 'up'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                        : selectedPrediction.predicted_movement === 'down'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/25'
                          : 'bg-blue-500/15 text-blue-300 border-blue-500/25'
                    }
                  >
                    {selectedPrediction.predicted_movement?.toUpperCase() || 'NEUTRAL'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Confidence</p>
                  <div className="flex items-center gap-3">
                    <span className="font-medium dark:text-white">
                      {((selectedPrediction.confidence || 0) * 100).toFixed(0)}%
                    </span>
                    <Progress
                      value={(selectedPrediction.confidence || 0) * 100}
                      className="h-2 flex-1"
                      indicatorClassName="bg-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sentiment Score */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sentiment Score</p>
                <div className="flex items-center gap-3">
                  <span className="font-medium dark:text-white">
                    {selectedPrediction.sentiment_score?.toFixed(2) || '0.00'}
                  </span>
                  <Progress
                    value={((selectedPrediction.sentiment_score || 0) + 1) / 2 * 100}
                    className="h-2 flex-1"
                    indicatorClassName={
                      selectedPrediction.sentiment_score > 0.2
                        ? 'bg-emerald-500'
                        : selectedPrediction.sentiment_score < -0.2
                          ? 'bg-rose-500'
                          : 'bg-blue-500'
                    }
                  />
                </div>
              </div>

              {/* Optional URL */}
              {selectedPrediction.url && (
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedPrediction.url} target="_blank" rel="noopener noreferrer">
                      Read Full Article
                    </a>
                  </Button>
                </div>
              )}

              {/* Close button at bottom (optional) */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" onClick={closeModal}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionHistory;