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

import { useState, useMemo, useEffect } from 'react';
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
import { getCardErrorMessage } from '@/utils/errorHandler';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// ============================================================================
// Color & Style Constants
// ============================================================================

const EMPTY_PREDICTIONS = Object.freeze([]);

const MOVEMENT_CONFIG = {
  up: {
    badge: 'bg-green-400/20 text-green-400 border-green-400/30',
    icon: TrendingUp,
    label: 'Up',
    color: 'text-green-400',
  },
  down: {
    badge: 'bg-red-400/20 text-red-400 border-red-400/30',
    icon: TrendingDown,
    label: 'Down',
    color: 'text-red-400',
  },
  neutral: {
    badge: 'bg-gray-700/50 text-gray-400 border-gray-700/50',
    icon: Minus,
    label: 'Neutral',
    color: 'text-gray-400',
  },
  unavailable: {
    badge: 'bg-gray-800 text-gray-500 border-gray-700',
    icon: Minus,
    label: 'Unavailable',
    color: 'text-gray-500',
  },
};

const CONFIDENCE_LEVELS = {
  high: { label: 'High', color: 'text-green-400', bg: 'bg-green-400/20' },
  medium: { label: 'Medium', color: 'text-gray-400', bg: 'bg-gray-700/50' },
  low: { label: 'Low', color: 'text-red-400', bg: 'bg-red-400/20' },
};

// ============================================================================
// Helper Functions
// ============================================================================

const formatDate = (dateString) => {
  if (!dateString) return 'Date unavailable';
  const date = new Date(dateString);
  if (!isValid(date)) return 'Date unavailable';
  return format(date, 'MMM dd, yyyy HH:mm');
};

const getConfidenceLevel = (confidence) => {
  if (!Number.isFinite(confidence)) return null;
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
};

const getSentimentLabel = (score) => {
  if (!Number.isFinite(score)) return null;
  if (score > 0.2) return 'Bullish';
  if (score < -0.2) return 'Bearish';
  return 'Neutral';
};

// ============================================================================
// Sub-components
// ============================================================================

const MovementBadge = ({ movement }) => {
  const normalizedMovement = typeof movement === 'string' ? movement.toLowerCase() : '';
  const config = MOVEMENT_CONFIG[normalizedMovement] || MOVEMENT_CONFIG.unavailable;
  const Icon = config.icon;
  return (
    <Badge className={cn('px-3 py-1 text-sm font-semibold border', config.badge)}>
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
};

MovementBadge.propTypes = {
  movement: PropTypes.string,
};

const ConfidenceDisplay = ({ confidence }) => {
  const level = getConfidenceLevel(confidence);
  if (!level) return <span className="text-sm text-gray-500">Unavailable</span>;

  const levelConfig = CONFIDENCE_LEVELS[level];
  const percent = Math.max(0, Math.min(100, confidence * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-200">{percent.toFixed(0)}%</span>
      <Badge className={cn('text-xs border-0 px-2 py-0.5', levelConfig.bg, levelConfig.color)}>
        {levelConfig.label}
      </Badge>
    </div>
  );
};

ConfidenceDisplay.propTypes = {
  confidence: PropTypes.number,
};

const SentimentScore = ({ score }) => {
  const label = getSentimentLabel(score);
  if (!label) return <span className="text-sm text-gray-500">Not scored</span>;

  const normalized = ((score + 1) / 2) * 100;
  const isPositive = score > 0.2;
  const isNegative = score < -0.2;
  const color = isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400';
  const barColor = isPositive ? 'bg-green-400' : isNegative ? 'bg-red-400' : 'bg-gray-500';
  return (
    <div className="flex items-center gap-3">
      <span className={cn('text-sm font-medium', color)}>{label}</span>
      <div className="w-16 h-1.5 rounded-full bg-gray-700">
        <div
          className={cn('h-full rounded-full', barColor)}
          style={{ width: `${Math.min(100, Math.max(0, normalized))}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">{score.toFixed(2)}</span>
    </div>
  );
};

SentimentScore.propTypes = {
  score: PropTypes.number,
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
        className="border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-gray-300 min-h-[44px] min-w-[44px] focus-visible:ring-gray-500 focus-visible:ring-offset-black"
        aria-label="First page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-gray-300 min-h-[44px] min-w-[44px] focus-visible:ring-gray-500 focus-visible:ring-offset-black"
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
        className="border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-gray-300 min-h-[44px] min-w-[44px] focus-visible:ring-gray-500 focus-visible:ring-offset-black"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-gray-300 min-h-[44px] min-w-[44px] focus-visible:ring-gray-500 focus-visible:ring-offset-black"
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
  predictions = EMPTY_PREDICTIONS,
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

  useEffect(() => {
    setCurrentPage(1);
  }, [predictions, itemsPerPage]);

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
  const confidenceValues = predictions
    .map((prediction) => prediction.confidence)
    .filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)))
    .map(Number);
  const averageConfidence = confidenceValues.length
    ? (confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) * 100
    : null;

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
          value={averageConfidence === null ? '—' : `${averageConfidence.toFixed(0)}%`}
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
                className={cn(
                  "text-gray-300 select-none py-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  sortable && "cursor-pointer transition-colors hover:text-white hover:underline hover:underline-offset-4"
                )}
                onClick={sortable ? () => handleSort('date') : undefined}
                tabIndex={sortable ? 0 : undefined}
                aria-sort={sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSort('date');
                  }
                }}
              >
                <span className="flex items-center">Date {getSortIcon('date')}</span>
              </TableHead>
              <TableHead
                className={cn(
                  "text-gray-300 select-none py-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  sortable && "cursor-pointer transition-colors hover:text-white hover:underline hover:underline-offset-4"
                )}
                onClick={sortable ? () => handleSort('stock_symbol') : undefined}
                tabIndex={sortable ? 0 : undefined}
                aria-sort={sortConfig.key === 'stock_symbol' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSort('stock_symbol');
                  }
                }}
              >
                <span className="flex items-center">Symbol {getSortIcon('stock_symbol')}</span>
              </TableHead>
              <TableHead
                className={cn(
                  "text-gray-300 select-none py-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  sortable && "cursor-pointer transition-colors hover:text-white hover:underline hover:underline-offset-4"
                )}
                onClick={sortable ? () => handleSort('predicted_movement') : undefined}
                tabIndex={sortable ? 0 : undefined}
                aria-sort={sortConfig.key === 'predicted_movement' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSort('predicted_movement');
                  }
                }}
              >
                <span className="flex items-center">Movement {getSortIcon('predicted_movement')}</span>
              </TableHead>
              <TableHead
                className={cn(
                  "text-gray-300 select-none py-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  sortable && "cursor-pointer transition-colors hover:text-white hover:underline hover:underline-offset-4"
                )}
                onClick={sortable ? () => handleSort('confidence') : undefined}
                tabIndex={sortable ? 0 : undefined}
                aria-sort={sortConfig.key === 'confidence' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSort('confidence');
                  }
                }}
              >
                <span className="flex items-center">Confidence {getSortIcon('confidence')}</span>
              </TableHead>
              <TableHead
                className={cn(
                  "text-gray-300 select-none py-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  sortable && "cursor-pointer transition-colors hover:text-white hover:underline hover:underline-offset-4"
                )}
                onClick={sortable ? () => handleSort('sentiment_score') : undefined}
                tabIndex={sortable ? 0 : undefined}
                aria-sort={sortConfig.key === 'sentiment_score' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSort('sentiment_score');
                  }
                }}
              >
                <span className="flex items-center">Sentiment {getSortIcon('sentiment_score')}</span>
              </TableHead>
              <TableHead
                className={cn(
                  "text-gray-300 select-none py-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  sortable && "cursor-pointer transition-colors hover:text-white hover:underline hover:underline-offset-4"
                )}
                onClick={sortable ? () => handleSort('source') : undefined}
                tabIndex={sortable ? 0 : undefined}
                aria-sort={sortConfig.key === 'source' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSort('source');
                  }
                }}
              >
                <span className="flex items-center">Source {getSortIcon('source')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPredictions.map((pred, index) => {
              const confidence = pred.confidence === null || pred.confidence === undefined
                ? null
                : Number.isFinite(Number(pred.confidence))
                  ? Number(pred.confidence)
                  : null;
              const movement = pred.predicted_movement ?? null;
              const symbol = pred.stock_symbol || pred.symbol || '—';
              return (
                <TableRow
                  key={pred.id || index}
                  className={cn(
                    'border-gray-800 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-gray-800/50 active:bg-gray-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500'
                  )}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={onRowClick ? `Open prediction details for ${symbol}` : undefined}
                  onClick={() => onRowClick?.(pred)}
                  onKeyDown={(event) => {
                    if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      onRowClick(pred);
                    }
                  }}
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
                    <SentimentScore score={pred.sentiment_score ?? null} />
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
          const confidence = pred.confidence === null || pred.confidence === undefined
            ? null
            : Number.isFinite(Number(pred.confidence))
              ? Number(pred.confidence)
              : null;
          const movement = pred.predicted_movement ?? null;
          const symbol = pred.stock_symbol || pred.symbol || '—';
          return (
            <div
              key={pred.id || index}
              className={cn(
                'p-4 bg-gray-900/95 border border-gray-800/50 rounded-lg transition-colors',
                onRowClick && 'cursor-pointer hover:border-gray-600 hover:bg-gray-800/50 active:bg-gray-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500'
              )}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={() => onRowClick?.(pred)}
              onKeyDown={(event) => {
                if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onRowClick(pred);
                }
              }}
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
                  <SentimentScore score={pred.sentiment_score ?? null} />
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
      'rounded-md border border-red-400/30 bg-red-400/10 p-6',
      className
    )}
  >
    <Alert variant="destructive" className="border-0 bg-transparent">
      <AlertCircle className="h-5 w-5 text-red-400" />
      <AlertTitle className="text-white font-semibold">Failed to load predictions</AlertTitle>
      <AlertDescription className="text-gray-400 text-sm">
        {getCardErrorMessage(typeof error === 'string' ? { message: error } : error)}
      </AlertDescription>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3 border-red-400/30 bg-red-400/10 hover:bg-red-400/20 text-red-400 min-h-[44px] focus-visible:ring-gray-500 focus-visible:ring-offset-black"
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