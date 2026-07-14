/**
 * PredictionHistory Page
 * 
 * Displays historical predictions with:
 * - Dual-axis chart showing confidence and sentiment scores over time
 * - Grid of prediction cards with key metrics
 * - Loading skeletons
 * - Error handling with retry
 * - Responsive design for all screen sizes
 * 
 * Data Structure:
 * - id: string|number
 * - date: ISO date string
 * - stock_symbol: string
 * - predicted_movement: 'up' | 'down' | 'neutral'
 * - confidence: number (0-1)
 * - sentiment_score: number (-1 to 1)
 * - headline: string
 * - source: string
 */

import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  FaArrowUp,
  FaArrowDown,
  FaRegCircle,
  FaExternalLinkAlt
} from 'react-icons/fa';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePredictionHistoryQuery } from '@/hooks/queries/usePredictionHistoryQuery';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// ============================================================================
// Chart Configuration
// ============================================================================

const CHART_COLORS = {
  confidence: {
    bg: 'rgba(59, 130, 246, 0.5)',
    border: 'rgba(59, 130, 246, 1)',
  },
  sentiment: {
    bg: 'rgba(16, 185, 129, 0.5)',
    border: 'rgba(16, 185, 129, 1)',
  },
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Loading skeleton for prediction cards
 */
const PredictionSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2 mt-2" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full mt-2" />
      </div>
      <div>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full mt-2" />
      </div>
    </CardContent>
  </Card>
);

/**
 * Individual prediction card component
 */
const PredictionCard = ({ prediction, index }) => {
  // Safe access with fallbacks
  const confidence = prediction.confidence || 0;
  const sentimentScore = prediction.sentiment_score || 0;
  const stockSymbol = prediction.stock_symbol || prediction.symbol || 'N/A';
  const movement = prediction.predicted_movement || 'neutral';
  
  // Movement icon
  const MovementIcon = movement === 'up' 
    ? FaArrowUp 
    : movement === 'down' 
      ? FaArrowDown 
      : FaRegCircle;
  
  const movementColor = movement === 'up' 
    ? 'text-green-500 dark:text-green-400' 
    : movement === 'down' 
      ? 'text-red-500 dark:text-red-400' 
      : 'text-gray-500 dark:text-gray-400';

  return (
    <Card 
      key={prediction.id || index} 
      className="shadow-lg border rounded-lg dark:border-gray-700 dark:bg-gray-800"
    >
      <CardHeader className="p-4 border-b dark:border-gray-700">
        <h3 className="font-semibold dark:text-white line-clamp-2">
          {prediction.headline?.length > 60
            ? `${prediction.headline.slice(0, 60)}...`
            : prediction.headline || 'No headline available'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {prediction.date ? new Date(prediction.date).toLocaleDateString() : 'Date unknown'} 
          {' | '}
          <span className="font-medium">{stockSymbol.toUpperCase()}</span>
        </p>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Movement Direction */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <MovementIcon className={movementColor} />
            <span className="ml-2 font-medium dark:text-white capitalize">
              {movement}
            </span>
          </div>
          {prediction.source && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
              {prediction.source}
            </span>
          )}
        </div>

        {/* Sentiment Score */}
        <div>
          <div className="flex justify-between text-sm font-medium dark:text-white">
            <span>Sentiment Score</span>
            <span className={sentimentScore >= 0 ? 'text-green-500' : 'text-red-500'}>
              {sentimentScore.toFixed(2)}
            </span>
          </div>
          <Progress
            value={Math.min(Math.abs(sentimentScore) * 100, 100)}
            className="mt-2 h-2"
            indicatorClassName={
              sentimentScore >= 0
                ? 'bg-green-500 dark:bg-green-400'
                : 'bg-red-500 dark:bg-red-400'
            }
          />
        </div>

        {/* Confidence Score */}
        <div>
          <div className="flex justify-between text-sm font-medium dark:text-white">
            <span>Confidence</span>
            <span>{(confidence * 100).toFixed(1)}%</span>
          </div>
          <Progress
            value={Math.min(confidence * 100, 100)}
            className="mt-2 h-2"
            indicatorClassName="bg-blue-500 dark:bg-blue-400"
          />
        </div>
      </CardContent>

      <CardFooter className="p-4 border-t dark:border-gray-700">
        <button
          className="text-blue-500 dark:text-blue-400 font-medium flex items-center hover:underline text-sm"
          onClick={() => {
            // TODO: Implement detailed view modal
            console.log('View details for prediction:', prediction.id);
          }}
        >
          View Details <FaExternalLinkAlt className="ml-2 w-3 h-3" />
        </button>
      </CardFooter>
    </Card>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const PredictionHistory = () => {
  const { data: rawPredictions = [], isLoading, error, refetch } = usePredictionHistoryQuery();

  // Filter out predictions without required fields
  const predictions = rawPredictions.filter(p => 
    p && (p.stock_symbol || p.symbol)
  );

  // Chart Data
  const chartData = {
    labels: predictions.map(pred => 
      pred.date ? new Date(pred.date).toLocaleDateString() : 'Unknown'
    ),
    datasets: [
      {
        label: 'Confidence Score',
        data: predictions.map(pred => (pred.confidence || 0) * 100),
        backgroundColor: CHART_COLORS.confidence.bg,
        borderColor: CHART_COLORS.confidence.border,
        borderWidth: 1,
      },
      {
        label: 'Sentiment Score',
        data: predictions.map(pred => (pred.sentiment_score || 0) * 100),
        backgroundColor: CHART_COLORS.sentiment.bg,
        borderColor: CHART_COLORS.sentiment.border,
        borderWidth: 1,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Prediction Metrics Over Time',
        font: { size: 16, weight: '600' },
        color: '#9ca3af',
      },
      legend: {
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw.toFixed(1)}%`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: '#9ca3af',
          callback: (value) => `${value}%`,
        },
        title: {
          display: true,
          text: 'Score (%)',
          color: '#9ca3af',
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#9ca3af',
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 10,
          }
        }
      }
    }
  };

  // ============================================================================
  // Render States
  // ============================================================================

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <PredictionSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive" className="border-rose-500/30 bg-rose-500/10">
          <AlertTitle className="text-rose-300 font-semibold">
            Error Loading Predictions
          </AlertTitle>
          <AlertDescription className="text-rose-200/80">
            {error.message || 'Failed to load prediction history'}
          </AlertDescription>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="mt-3 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
          >
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="p-4">
        <Alert className="border-gray-700 bg-gray-800/50">
          <AlertTitle className="text-gray-200">No Prediction History Available</AlertTitle>
          <AlertDescription className="text-gray-400">
            Your prediction history will appear here after making predictions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="p-4 dark:bg-gray-900 min-h-screen">
      <h2 className="text-2xl font-semibold mb-6 dark:text-white">
        Prediction History
        <span className="text-sm font-normal text-gray-400 ml-3">
          ({predictions.length} predictions)
        </span>
      </h2>

      {/* Chart Section */}
      {predictions.length > 1 && (
        <div className="mb-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="h-[300px] sm:h-[350px] md:h-[400px]">
            <Bar
              data={chartData}
              options={chartOptions}
            />
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {predictions.map((prediction, index) => (
          <PredictionCard 
            key={prediction.id || index} 
            prediction={prediction} 
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export default PredictionHistory;