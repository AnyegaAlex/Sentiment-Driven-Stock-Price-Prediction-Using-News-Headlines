// pages/PredictionHistory.jsx
/**
 * Prediction History Page
 * 
 * Displays comprehensive prediction history with:
 * - Summary cards (accuracy, F1, total predictions, recent performance)
 * - Drift alert when model performance degrades
 * - Performance metrics chart (F1 Score trend)
 * - Filterable prediction table with price tracking
 * - Detailed prediction modal with SHAP explanations
 * - Resolution countdown for pending predictions
 * - Export functionality
 * 
 * Features:
 * - Optimized data fetching with React Query
 * - Real-time updates via refetch interval
 * - Responsive design with Tailwind
 * - Dark mode support
 * - Event tracking for analytics
 * 
 * @version 4.0.0
 * @component
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Line,
  LineChart,
  Legend,
} from 'recharts';
import {
  Loader2,
  RefreshCw,
  Download,
  Filter,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Eye,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/services/client';
import { trackEvent } from '@/utils/analytics';
import { useToast } from '@/hooks/use-toast';
import { FilterBar } from '@/components/FilterBar';
import PredictionSummaryCards from '@/components/PredictionSummaryCards';
import DriftAlert from '@/components/DriftAlert';
import PerformanceChart from '@/components/PerformanceChart';
import PredictionModal from '@/components/PredictionModal';

// ============================================================================
// Constants
// ============================================================================

const RESOLUTION_DAYS = 7;
const PAGE_SIZE = 25;
const AVAILABLE_SYMBOLS = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'IBM', 'JPM', 'PLTR', 'LULU'];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  correct: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  incorrect: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const DIRECTION_ICONS = {
  up: <TrendingUp className="h-4 w-4 text-green-500" />,
  down: <TrendingDown className="h-4 w-4 text-red-500" />,
  neutral: <Minus className="h-4 w-4 text-yellow-500" />,
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * PredictionStatusBadge – Shows prediction resolution status
 */
const PredictionStatusBadge = ({ isCorrect, isResolved }) => {
  if (!isResolved) {
    return (
      <Badge variant="outline" className="border-yellow-300 text-yellow-600 dark:border-yellow-700 dark:text-yellow-400">
        <Clock className="mr-1 h-3 w-3" />
        Pending
      </Badge>
    );
  }
  
  if (isCorrect) {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle className="mr-1 h-3 w-3" />
        Correct
      </Badge>
    );
  }
  
  return (
    <Badge variant="destructive">
      <XCircle className="mr-1 h-3 w-3" />
      Incorrect
    </Badge>
  );
};

PredictionStatusBadge.propTypes = {
  isCorrect: PropTypes.bool,
  isResolved: PropTypes.bool,
};

/**
 * ConfidenceIndicator – Shows confidence with color coding
 */
const ConfidenceIndicator = ({ confidence }) => {
  const getColor = (val) => {
    if (val >= 70) return 'bg-green-500';
    if (val >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Progress
              value={confidence}
              className={cn('h-2 w-16', getColor(confidence))}
            />
            <span className="text-xs font-medium">{Math.round(confidence)}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Confidence: {Math.round(confidence)}%</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

ConfidenceIndicator.propTypes = {
  confidence: PropTypes.number.isRequired,
};

/**
 * PriceChangeIndicator – Shows price change with color
 */
const PriceChangeIndicator = ({ change }) => {
  // ✅ Parse the value once – handles string, number, null, undefined
  const numChange = typeof change === 'number' ? change : parseFloat(change);
  
  // ✅ Handle all invalid cases using numChange
  if (numChange === null || numChange === undefined || isNaN(numChange)) {
    return <span className="text-gray-400">—</span>;
  }
  
  // ✅ Use numChange for all comparisons and formatting
  const isPositive = numChange > 0;
  const isNegative = numChange < 0;
  
  return (
    <span className={cn(
      'font-mono text-sm font-medium',
      isPositive && 'text-green-600 dark:text-green-400',
      isNegative && 'text-red-600 dark:text-red-400',
      !isPositive && !isNegative && 'text-gray-500 dark:text-gray-400'
    )}>
      {isPositive ? '+' : ''}{numChange.toFixed(2)}%
    </span>
  );
};

PriceChangeIndicator.propTypes = {
  change: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

/**
 * ResolutionCountdown – Shows days until resolution
 */
const ResolutionCountdown = ({ createdAt }) => {
  const resolutionDate = new Date(createdAt);
  resolutionDate.setDate(resolutionDate.getDate() + RESOLUTION_DAYS);
  
  const now = new Date();
  const daysRemaining = differenceInDays(resolutionDate, now);
  
  if (daysRemaining <= 0) {
    return <span className="text-sm text-green-600 dark:text-green-400">Resolving...</span>;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="h-3 w-3" />
            {daysRemaining}d
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Resolves on {format(resolutionDate, 'MMM d, yyyy')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

ResolutionCountdown.propTypes = {
  createdAt: PropTypes.string.isRequired,
};

// ============================================================================
// Main Component
// ============================================================================

const PredictionHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [symbol, setSymbol] = useState('');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [outcome, setOutcome] = useState('all');
  const [source, setSource] = useState('all');
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [chartMetric, setChartMetric] = useState('f1');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ---- Queries ----
  const predictionsQuery = useQuery({
    queryKey: ['predictions', { symbol, dateRange, outcome, source, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (symbol) params.append('symbol', symbol);
      if (dateRange?.from) params.append('date_from', dateRange.from);
      if (dateRange?.to) params.append('date_to', dateRange.to);
      if (outcome !== 'all') params.append('outcome', outcome);
      if (source !== 'all') params.append('source', source);
      params.append('limit', PAGE_SIZE);
      params.append('offset', page * PAGE_SIZE);
      
      const response = await apiClient.get(`/predictions/?${params.toString()}`);
      return response;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const performanceQuery = useQuery({
    queryKey: ['performance', symbol],
    queryFn: async () => {
      const url = symbol ? `/performance/?symbol=${symbol}` : '/performance/';
      const response = await apiClient.get(url);
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });

  const driftQuery = useQuery({
    queryKey: ['drift'],
    queryFn: async () => {
      const response = await apiClient.get('/drift/');
      return response;
    },
    staleTime: 10 * 60 * 1000,
  });

  const symbolsQuery = useQuery({
    queryKey: ['symbols'],
    queryFn: async () => {
      const response = await apiClient.get('/symbols/');
      return response || AVAILABLE_SYMBOLS;
    },
    staleTime: 60 * 60 * 1000,
    placeholderData: AVAILABLE_SYMBOLS,
  });

  // ---- Handlers ----
  const handleRowClick = useCallback((prediction) => {
    setSelectedPrediction(prediction);
    setIsModalOpen(true);
    trackEvent('prediction_history_row_clicked', { id: prediction.id });
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPrediction(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    trackEvent('prediction_history_refresh');
    try {
      await Promise.all([
        predictionsQuery.refetch(),
        performanceQuery.refetch(),
        driftQuery.refetch(),
      ]);
      toast({
        title: "Refreshed",
        description: "All data has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [predictionsQuery, performanceQuery, driftQuery, toast]);

  const handleExportCSV = useCallback(async () => {
    trackEvent('prediction_history_export');
    
    try {
      const params = new URLSearchParams();
      if (symbol) params.append('symbol', symbol);
      if (dateRange?.from) params.append('date_from', dateRange.from);
      if (dateRange?.to) params.append('date_to', dateRange.to);
      if (outcome !== 'all') params.append('outcome', outcome);
      if (source !== 'all') params.append('source', source);
      params.append('limit', 10000);
      params.append('offset', 0);
      
      const response = await apiClient.get(`/predictions/?${params.toString()}`);
      const predictions = response.data?.results || [];
      
      if (predictions.length === 0) {
        toast({ title: "No Data", description: "No predictions to export.", variant: "destructive" });
        return;
      }
      
      const headers = ['Date', 'Symbol', 'Prediction', 'Actual', 'Status', 'Confidence (%)', 'Price at Prediction', 'Price at Resolution', 'Price Change (%)', 'Source', 'Created At'];
      const rows = predictions.map(p => [
        p.date || '', p.stock_symbol || '', p.predicted_movement || '', p.actual_direction || 'Pending',
        (p.is_correct !== null && p.is_correct !== undefined) ? (p.is_correct ? 'Correct' : 'Incorrect') : 'Pending',
        p.confidence_percent || (p.confidence * 100) || 0,
        p.price_at_prediction ? Number(p.price_at_prediction).toFixed(2) : '',
        p.price_at_resolution ? Number(p.price_at_resolution).toFixed(2) : '',
        p.price_change_percent || '',
        p.source || 'lstm',
        p.created_at ? format(new Date(p.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `predictions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      toast({ title: "Export Successful", description: `Exported ${predictions.length} predictions.` });
    } catch (error) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    }
  }, [symbol, dateRange, outcome, source, toast]);

  // ---- Computed Values ----
  const predictions = predictionsQuery.data?.results || [];
  const total = predictionsQuery.data?.total || 0;
  const perfData = performanceQuery.data;
  const driftData = driftQuery.data;
  const availableSymbols = symbolsQuery.data || AVAILABLE_SYMBOLS;

  const isLoading = predictionsQuery.isLoading || performanceQuery.isLoading;
  const isError = predictionsQuery.isError || performanceQuery.isError;

  // ---- Render ----
  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Prediction History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track your predictions and model performance over time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={cn(
              'h-4 w-4 mr-2',
              isRefreshing && 'animate-spin'
            )} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Drift Alert */}
      {driftData?.drift_detected && (
        <DriftAlert severity={driftData.severity} drop={driftData.drop_percent} />
      )}

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <PredictionSummaryCards data={perfData} />
      )}

      {/* Filters */}
      <FilterBar
        symbol={symbol}
        onSymbolChange={setSymbol}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        outcome={outcome}
        onOutcomeChange={setOutcome}
        source={source}
        onSourceChange={setSource}
        availableSymbols={availableSymbols}
      />

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                {chartMetric === 'f1' ? 'F1 Score' : 'Accuracy'} over the last 30 days
              </CardDescription>
            </div>
            <Tabs value={chartMetric} onValueChange={setChartMetric} className="w-auto">
              <TabsList>
                <TabsTrigger value="f1">F1 Score</TabsTrigger>
                <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
                <TabsTrigger value="precision">Precision</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <PerformanceChart
            data={perfData}
            metric={chartMetric}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Prediction Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <CardTitle>Predictions</CardTitle>
              <CardDescription>
                Showing {predictions.length} of {total} predictions
                <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                  ({predictions.filter(p => p.is_correct === null).length} pending)
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Resolves in {RESOLUTION_DAYS} days</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center gap-2 py-12 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              <span>Error loading predictions. Please try again.</span>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Retry
              </Button>
            </div>
          ) : predictions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <FileText className="mb-4 h-12 w-12" />
              <p className="text-lg font-medium">No predictions found</p>
              <p className="text-sm">Try adjusting your filters or generate a new prediction</p>
            </div>
          ) : (
            <>
              <ScrollArea className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Prediction</TableHead>
                      <TableHead className="hidden md:table-cell">Actual</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Price at Pred</TableHead>
                      <TableHead className="hidden lg:table-cell">Price Change</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead className="hidden sm:table-cell">Resolves In</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {predictions.map((pred) => {
                      const isResolved = pred.is_correct !== null && pred.is_correct !== undefined;
                      const priceChange = pred.price_change_percent || null;
                      const isPending = !isResolved;
                      
                      return (
                        <TableRow
                          key={pred.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(pred)}
                        >
                          <TableCell className="text-sm">
                            {format(new Date(pred.date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {pred.stock_symbol}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {DIRECTION_ICONS[pred.predicted_movement] || DIRECTION_ICONS.neutral}
                              <span className="capitalize">{pred.predicted_movement}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {isResolved ? (
                              <div className="flex items-center gap-1">
                                {DIRECTION_ICONS[pred.actual_direction] || DIRECTION_ICONS.neutral}
                                <span className="capitalize">{pred.actual_direction || '—'}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Pending</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <PredictionStatusBadge
                              isCorrect={pred.is_correct}
                              isResolved={isResolved}
                            />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell font-mono text-sm">
                            {pred.price_at_prediction ? `$${Number(pred.price_at_prediction).toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {isResolved ? (
                              <PriceChangeIndicator change={priceChange} />
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ConfidenceIndicator confidence={pred.confidence * 100 || 0} />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {isPending ? (
                              <ResolutionCountdown createdAt={pred.created_at} />
                            ) : (
                              <span className="text-sm text-green-600 dark:text-green-400">✓ Resolved</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(pred);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t px-4 py-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * PAGE_SIZE >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Prediction Modal */}
      <PredictionModal
        prediction={selectedPrediction}
        isOpen={isModalOpen}
        onClose={closeModal}
        onRefresh={handleRefresh}
      />
    </div>
  );
};

export default React.memo(PredictionHistory);