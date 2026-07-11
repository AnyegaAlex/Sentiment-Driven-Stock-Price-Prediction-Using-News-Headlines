import { useState, useMemo } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// ============================================================================
// Color Constants (unchanged)
// ============================================================================
const PREDICTION_COLORS = {
  BUY: {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    text: 'text-emerald-400'
  },
  SELL: {
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
    text: 'text-rose-400'
  },
  HOLD: {
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    text: 'text-blue-400'
  }
};

const CONFIDENCE_COLORS = {
  high: 'bg-emerald-500/15 text-emerald-300',
  medium: 'bg-yellow-500/15 text-yellow-300',
  low: 'bg-rose-500/15 text-rose-300'
};

// ============================================================================
// Main Component (unchanged except for touch target improvements)
// ============================================================================

const PredictionHistoryList = ({ 
  predictions = [], 
  isLoading = false,
  error = null,
  onRetry,
  itemsPerPage = 10,
  showPagination = true,
  className = '',
  emptyMessage = 'No prediction history available',
  onRowClick,
  sortable = true
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  const sortedPredictions = useMemo(() => {
    if (!sortConfig.key) return predictions;
    return [...predictions].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'created_at') {
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
  }, [predictions, sortConfig]);

  const paginatedPredictions = useMemo(() => {
    if (!showPagination) return sortedPredictions;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedPredictions.slice(start, end);
  }, [sortedPredictions, currentPage, itemsPerPage, showPagination]);

  const totalPages = Math.ceil(predictions.length / itemsPerPage);

  const handleSort = (key) => {
    if (!sortable) return;
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (!sortable) return null;
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4 inline" />
      : <ArrowDown className="ml-2 h-4 w-4 inline" />;
  };

  const formatDate = (dateString) => {
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

  if (isLoading) {
    return <LoadingSkeleton className={className} />;
  }

  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={onRetry} 
        className={className}
      />
    );
  }

  if (!predictions.length) {
    return (
      <EmptyState 
        message={emptyMessage}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-md border border-gray-800/50 bg-gray-900/95 overflow-x-auto">
        <Table className="min-w-[640px] md:min-w-full">
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-gray-800/50">
              <TableHead 
                className="text-gray-300 cursor-pointer select-none py-3 min-h-[44px]"
                onClick={() => handleSort('created_at')}
              >
                <span className="flex items-center">
                  Date {getSortIcon('created_at')}
                </span>
              </TableHead>
              <TableHead 
                className="text-gray-300 cursor-pointer select-none py-3 min-h-[44px]"
                onClick={() => handleSort('prediction')}
              >
                <span className="flex items-center">
                  Prediction {getSortIcon('prediction')}
                </span>
              </TableHead>
              <TableHead 
                className="text-gray-300 cursor-pointer select-none py-3 min-h-[44px]"
                onClick={() => handleSort('confidence')}
              >
                <span className="flex items-center">
                  Confidence {getSortIcon('confidence')}
                </span>
              </TableHead>
              <TableHead 
                className="text-gray-300 cursor-pointer select-none py-3 min-h-[44px]"
                onClick={() => handleSort('source')}
              >
                <span className="flex items-center">
                  Source {getSortIcon('source')}
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPredictions.map((pred, index) => {
              const confidence = Number(pred.confidence) || 0;
              const confidenceLevel = getConfidenceLevel(confidence);
              
              return (
                <TableRow 
                  key={pred.id || index}
                  className={cn(
                    "border-gray-800 hover:bg-gray-800/50 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(pred)}
                >
                  <TableCell className="font-mono text-sm text-gray-300 py-3">
                    {formatDate(pred.created_at)}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge 
                      className={cn(
                        "px-3 py-1 text-sm font-semibold",
                        PREDICTION_COLORS[pred.prediction]?.badge || 'bg-gray-500/15 text-gray-300'
                      )}
                    >
                      {pred.prediction}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-200">
                        {(confidence * 100).toFixed(1)}%
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs border-0",
                          CONFIDENCE_COLORS[confidenceLevel]
                        )}
                      >
                        {confidenceLevel}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400 py-3">
                    {pred.source || 'Unknown'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {showPagination && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={predictions.length}
        />
      )}

      {showPagination && predictions.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
          {Math.min(currentPage * itemsPerPage, predictions.length)} of{' '}
          {predictions.length} predictions
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Pagination Controls – Responsive Fixes
// ============================================================================

const PaginationControls = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  itemsPerPage,
  totalItems 
}) => {
  return (
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

      <span className="text-sm text-gray-400">
        Page {currentPage} of {totalPages}
      </span>

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
};

// ============================================================================
// Sub‑components (LoadingSkeleton, EmptyState, ErrorDisplay) – unchanged
// ============================================================================

const LoadingSkeleton = ({ className }) => (
  <div className={cn("space-y-4", className)}>
    <div className="rounded-md border border-gray-800/50 bg-gray-900/95 p-4">
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-4 pb-3 border-b border-gray-800">
          <Skeleton className="h-5 w-20 bg-gray-800" />
          <Skeleton className="h-5 w-24 bg-gray-800" />
          <Skeleton className="h-5 w-20 bg-gray-800" />
          <Skeleton className="h-5 w-16 bg-gray-800" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            <Skeleton className="h-5 w-32 bg-gray-800" />
            <Skeleton className="h-6 w-16 bg-gray-800" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-12 bg-gray-800" />
              <Skeleton className="h-5 w-14 bg-gray-800" />
            </div>
            <Skeleton className="h-5 w-20 bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-0 justify-between">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 bg-gray-800" />
        <Skeleton className="h-8 w-8 bg-gray-800" />
      </div>
      <Skeleton className="h-5 w-32 bg-gray-800" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 bg-gray-800" />
        <Skeleton className="h-8 w-8 bg-gray-800" />
      </div>
    </div>
  </div>
);

LoadingSkeleton.propTypes = { className: PropTypes.string };

const EmptyState = ({ message, className }) => (
  <div className={cn(
    "rounded-md border border-gray-800/50 bg-gray-900/95 p-8",
    "flex flex-col items-center justify-center text-center",
    className
  )}>
    <div className="rounded-full bg-gray-800/50 p-3 mb-3">
      <AlertCircle className="h-6 w-6 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-200 mb-1">No Data Available</h3>
    <p className="text-sm text-gray-400">{message}</p>
  </div>
);

EmptyState.propTypes = {
  message: PropTypes.string.isRequired,
  className: PropTypes.string
};

const ErrorDisplay = ({ error, onRetry, className }) => (
  <div className={cn(
    "rounded-md border border-rose-500/30 bg-rose-500/10 p-6",
    className
  )}>
    <Alert variant="destructive" className="border-0 bg-transparent">
      <AlertCircle className="h-5 w-5 text-rose-400" />
      <AlertTitle className="text-rose-300 font-semibold">
        Failed to load predictions
      </AlertTitle>
      <AlertDescription className="text-rose-200/80 text-sm">
        {error}
      </AlertDescription>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 min-h-[44px] min-w-[44px]"
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
  className: PropTypes.string
};

// ============================================================================
// PropTypes
// ============================================================================

PredictionHistoryList.propTypes = {
  predictions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      created_at: PropTypes.string.isRequired,
      prediction: PropTypes.oneOf(['BUY', 'SELL', 'HOLD']).isRequired,
      confidence: PropTypes.number.isRequired,
      source: PropTypes.string
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
  sortable: PropTypes.bool
};

export default PredictionHistoryList;