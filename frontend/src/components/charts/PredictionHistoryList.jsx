/**
 * PredictionHistoryList
 *
 * Displays predictions in a responsive table with card fallback for mobile.
 * Features:
 * - Sortable columns (Date, Symbol, Movement, Confidence, Sentiment, Source)
 * - Color-coded badges for up/down/neutral movements
 * - Confidence level indicators (High/Medium/Low)
 * - Sentiment score with visual progress bar
 * - Responsive: table on desktop, cards on mobile
 * - Pagination with page controls
 * - Clickable rows to open detailed view (via onRowClick prop)
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { format, isValid } from 'date-fns';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// ============================================================================
// Color & Style Constants
// ============================================================================

const MOVEMENT_CONFIG = {
  up: {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    icon: TrendingUp,
    label: 'Up',
    color: 'text-emerald-400',
  },
  down: {
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
    icon: TrendingDown,
    label: 'Down',
    color: 'text-rose-400',
  },
  neutral: {
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    icon: Minus,
    label: 'Neutral',
    color: 'text-blue-400',
  },
};

const CONFIDENCE_LEVELS = {
  high: { label: 'High', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  low: { label: 'Low', color: 'text-rose-400', bg: 'bg-rose-500/15' },
};

// ============================================================================
// Helper Functions
// ============================================================================

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return 'Invalid date';
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch {
    return 'Invalid date';
  }
};

const getConfidenceLevel = (confidence) => {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
};

const getSentimentLabel = (score) => {
  if (score > 0.2) return 'Bullish';
  if (score < -0.2) return 'Bearish';
  return 'Neutral';
};

// ============================================================================
// Sub-components
// ============================================================================

const MovementBadge = ({ movement }) => {
  const config = MOVEMENT_CONFIG[movement] || MOVEMENT_CONFIG.neutral;
  const Icon = config.icon;
  return (
    <Badge className={cn('px-3 py-1 text-sm font-semibold', config.badge)}>
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
};

const ConfidenceDisplay = ({ confidence }) => {
  const level = getConfidenceLevel(confidence);
  const levelConfig = CONFIDENCE_LEVELS[level];
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-200">
        {(confidence * 100).toFixed(0)}%
      </span>
      <Badge className={cn('text-xs border-0 px-2 py-0.5', levelConfig.bg, levelConfig.color)}>
        {levelConfig.label}
      </Badge>
    </div>
  );
};

const SentimentScore = ({ score }) => {
  const label = getSentimentLabel(score);
  const normalized = ((score + 1) / 2) * 100;
  const isPositive = score > 0.2;
  const isNegative = score < -0.2;
  const color = isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-blue-400';
  return (
    <div className="flex items-center gap-3">
      <span className={cn('text-sm font-medium', color)}>{label}</span>
      <div className="w-16 h-1.5 rounded-full bg-gray-700">
        <div
          className={cn('h-full rounded-full', isPositive ? 'bg-emerald-400' : isNegative ? 'bg-rose-400' : 'bg-blue-400')}
          style={{ width: `${Math.min(100, Math.max(0, normalized))}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">{score.toFixed(2)}</span>
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 text-center">
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-xl font-bold text-gray-100">{value}</p>
  </div>
);
StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

const PaginationControls = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-0 justify-between">
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-gray-300 min-h-[44px] min-w-[44px]"
        aria-label="First page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-gray-300 min-h-[44px] min-w-[44px]"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
    <span className="text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-gray-300 min-h-[44px] min-w-[44px]"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-gray-300 min-h-[44px] min-w-[44px]"
        aria-label="Last page"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

PaginationControls.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

// ============================================================================
// Main Component
// ============================================================================

const PredictionHistoryList = ({
  predictions = [],
  isLoading = false,
  error = null,
  onRetry,
  itemsPerPage = 10,
  showPagination = true,
  className = '',
  emptyMessage = 'No predictions yet.',
  onRowClick,
  sortable = true,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const sortedPredictions = useMemo(() => {
    if (!sortConfig.key || !sortable) return predictions;
    return [...predictions].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      if (sortConfig.key === 'confidence') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [predictions, sortConfig, sortable]);

  const paginatedPredictions = useMemo(() => {
    if (!showPagination) return sortedPredictions;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedPredictions.slice(start, end);
  }, [sortedPredictions, currentPage, itemsPerPage, showPagination]);

  const totalPages = Math.ceil(predictions.length / itemsPerPage);

  const handleSort = (key) => {
    if (!sortable) return;
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (key) => {
    if (!sortable) return null;
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 inline" />
    );
  };

  if (isLoading) {
    return <LoadingSkeleton className={className} />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={onRetry} className={className} />;
  }

  if (!predictions.length) {
    return <EmptyState message={emptyMessage} className={className} />;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={predictions.length} />
        <StatCard
          label="Avg Confidence"
          value={`${(predictions.reduce((acc, p) => acc + (p.confidence || 0), 0) / predictions.length * 100).toFixed(0)}%`}
        />
        <StatCard
          label="Bullish"
          value={predictions.filter((p) => getSentimentLabel(p.sentiment_score) === 'Bullish').length}
        />
        <StatCard
          label="Bearish"
          value={predictions.filter((p) => getSentimentLabel(p.sentiment_score) === 'Bearish').length}
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-md border border-gray-800/50 bg-gray-900/95 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-gray-800/50">
              <TableHead
                className="text-gray-300 cursor-pointer select-none py-3 min-h-[44px]"
                onClick={() => handleSort('date')}
              >
                <span className="flex items-center">Date {getSortIcon('date')}</span>
              </TableHead>
              <TableHead
                className="text-gray-300 cursor-pointer select-none py-3 min-h-[44px]"
                onClick={() => handleSort('stock_symbol')}
              >
                <span className="flex items-center">Symbol {getSortIcon('stock_symbol')}</span>
              </TableHead>
              <TableHead
                className="text-gray-300 cursor-pointer select-none py-3 min-h-[44px]"
                onClick={() => handleSort('predicted_movement')}
              >
                <span className="flex items-center">Movement {getSortIcon('predicted_movement')}</span>
              </TableHead>
              <TableHead
                className="text-gray-300 cursor-pointer select-none py-3 min-h-[44px]"
                onClick={() => handleSort('confidence')}
              >
                <span className="flex items-center">Confidence {getSortIcon('confidence')}</span>
              </TableHead>
              <TableHead
                className="text-gray-300 cursor-pointer select-none py-3 min-h-[44px]"
                onClick={() => handleSort('sentiment_score')}
              >
                <span className="flex items-center">Sentiment {getSortIcon('sentiment_score')}</span>
              </TableHead>
              <TableHead
                className="text-gray-300 cursor-pointer select-none py-3 min-h-[44px]"
                onClick={() => handleSort('source')}
              >
                <span className="flex items-center">Source {getSortIcon('source')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPredictions.map((pred, index) => {
              const confidence = Number(pred.confidence) || 0;
              const movement = pred.predicted_movement || 'neutral';
              const symbol = pred.stock_symbol || pred.symbol || '—';
              return (
                <TableRow
                  key={pred.id || index}
                  className={cn(
                    'border-gray-800 hover:bg-gray-800/50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(pred)}
                >
                  <TableCell className="font-mono text-sm text-gray-300 py-3">
                    {formatDate(pred.date || pred.created_at)}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-gray-300 py-3">
                    {symbol.toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <MovementBadge movement={movement} />
                  </TableCell>
                  <TableCell>
                    <ConfidenceDisplay confidence={confidence} />
                  </TableCell>
                  <TableCell>
                    <SentimentScore score={pred.sentiment_score || 0} />
                  </TableCell>
                  <TableCell className="text-sm text-gray-400 py-3">
                    {pred.source || '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {paginatedPredictions.map((pred, index) => {
          const confidence = Number(pred.confidence) || 0;
          const movement = pred.predicted_movement || 'neutral';
          const symbol = pred.stock_symbol || pred.symbol || '—';
          return (
            <div
              key={pred.id || index}
              className="p-4 bg-gray-900/95 border border-gray-800/50 rounded-lg hover:border-gray-700 transition-colors cursor-pointer"
              onClick={() => onRowClick?.(pred)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-200">{symbol.toUpperCase()}</p>
                  <p className="text-xs text-gray-400">{formatDate(pred.date || pred.created_at)}</p>
                </div>
                <MovementBadge movement={movement} />
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Confidence</span>
                  <ConfidenceDisplay confidence={confidence} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Sentiment</span>
                  <SentimentScore score={pred.sentiment_score || 0} />
                </div>
                {pred.source && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Source</span>
                    <span>{pred.source}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {showPagination && predictions.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
          {Math.min(currentPage * itemsPerPage, predictions.length)} of {predictions.length} predictions
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Sub-components (LoadingSkeleton, EmptyState, ErrorDisplay)
// ============================================================================

const LoadingSkeleton = ({ className }) => (
  <div className={cn('space-y-4', className)}>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-16 rounded-lg bg-gray-800" />
      ))}
    </div>
    <Skeleton className="h-64 w-full rounded-lg bg-gray-800" />
  </div>
);
LoadingSkeleton.propTypes = { className: PropTypes.string };

const EmptyState = ({ message, className }) => (
  <div
    className={cn(
      'rounded-md border border-gray-800/50 bg-gray-900/95 p-8 flex flex-col items-center justify-center text-center',
      className
    )}
  >
    <div className="rounded-full bg-gray-800/50 p-3 mb-3">
      <AlertCircle className="h-6 w-6 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-200 mb-1">No Predictions Yet</h3>
    <p className="text-sm text-gray-400">{message}</p>
  </div>
);
EmptyState.propTypes = {
  message: PropTypes.string.isRequired,
  className: PropTypes.string,
};

const ErrorDisplay = ({ error, onRetry, className }) => (
  <div
    className={cn(
      'rounded-md border border-rose-500/30 bg-rose-500/10 p-6',
      className
    )}
  >
    <Alert variant="destructive" className="border-0 bg-transparent">
      <AlertCircle className="h-5 w-5 text-rose-400" />
      <AlertTitle className="text-rose-300 font-semibold">Failed to load predictions</AlertTitle>
      <AlertDescription className="text-rose-200/80 text-sm">{error}</AlertDescription>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 min-h-[44px]"
        >
          Retry
        </Button>
      )}
    </Alert>
  </div>
);
ErrorDisplay.propTypes = {
  error: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
  className: PropTypes.string,
};

// ============================================================================
// PropTypes
// ============================================================================

PredictionHistoryList.propTypes = {
  predictions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      date: PropTypes.string,
      created_at: PropTypes.string,
      stock_symbol: PropTypes.string,
      symbol: PropTypes.string,
      predicted_movement: PropTypes.oneOf(['up', 'down', 'neutral']),
      confidence: PropTypes.number,
      sentiment_score: PropTypes.number,
      headline: PropTypes.string,
      source: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func,
  itemsPerPage: PropTypes.number,
  showPagination: PropTypes.bool,
  className: PropTypes.string,
  emptyMessage: PropTypes.string,
  onRowClick: PropTypes.func,
  sortable: PropTypes.bool,
};

export default PredictionHistoryList;