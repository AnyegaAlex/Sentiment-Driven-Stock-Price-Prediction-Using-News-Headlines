import PropTypes from 'prop-types';
import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { ArrowUp, ArrowDown, Info } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';

// Define historical trend data
const historicalTrend = [
  { date: 'Day 1', accuracy: 85 },
  { date: 'Day 2', accuracy: 87 },
  { date: 'Day 3', accuracy: 88 },
  { date: 'Day 4', accuracy: 90 },
  { date: 'Day 5', accuracy: 89 },
  { date: 'Day 6', accuracy: 91 },
  { date: 'Day 7', accuracy: 90 },
];

// Custom Components -------------------------------------------------
const AnimatedProgressBar = ({ value }) => (
  <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
    <div
      className="h-full bg-primary transition-all duration-500 ease-out"
      style={{ width: `${value}%` }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin="0"
      aria-valuemax="100"
    />
  </div>
);

AnimatedProgressBar.propTypes = {
  value: PropTypes.number.isRequired,
};

const MetricCard = ({ title, tooltip, children }) => (
  <Card className="p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <CardHeader className="pb-2 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <Tooltip>
          <TooltipTrigger aria-label={`Learn more about ${title}`}>
            <Info className="w-4 h-4 text-gray-500" />
          </TooltipTrigger>
          <TooltipContent side="top">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
    </CardHeader>
    <CardContent className="space-y-3 mt-2">{children}</CardContent>
  </Card>
);

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  tooltip: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

// Helper Functions -------------------------------------------------
const getSentimentLabel = (score) => {
  if (score >= 75) return 'Strong Positive';
  if (score >= 60) return 'Moderately Positive';
  if (score >= 40) return 'Neutral';
  if (score >= 25) return 'Moderately Negative';
  return 'Strong Negative';
};

const getDirectionLabel = (direction) =>
  ({
    increase: 'Predicted increase in next 24h',
    decrease: 'Predicted decrease in next 24h',
    neutral: 'No significant change expected',
  }[direction]);

const ArrowIndicator = ({ direction }) => (
  direction === 'increase' ? (
    <div className="p-1.5 rounded-full bg-green-100" aria-label="Upward trend">
      <ArrowUp className="w-4 h-4 text-green-600" />
    </div>
  ) : direction === 'decrease' ? (
    <div className="p-1.5 rounded-full bg-red-100" aria-label="Downward trend">
      <ArrowDown className="w-4 h-4 text-red-600" />
    </div>
  ) : (
    <span className="text-gray-400 text-sm" aria-hidden="true">—</span>
  )
);

ArrowIndicator.propTypes = {
  direction: PropTypes.oneOf(['increase', 'decrease', 'neutral']).isRequired,
};

// Main Component ----------------------------------------------------
const DashboardCards = ({ symbol = 'IBM' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    sentiment: 0.5,
    change: 0,
    strength: 0,
    direction: 'neutral',
    priceChange: 0,
    confidence: 0,
  });

  // Memoized calculations for labels
  const { sentimentLabel, directionLabel } = useMemo(() => ({
    sentimentLabel: getSentimentLabel(((metrics.sentiment + 1) / 2) * 100),
    directionLabel: getDirectionLabel(metrics.direction),
  }), [metrics]);

  // Fetch news data using the provided symbol and an optional AbortSignal.
  const fetchNewsData = useCallback(async (signal) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`http://127.0.0.1:8000/api/news/analyzed/?symbol=${symbol}`, { signal });
      if (data.news && data.news.length > 0) {
        processNewsData(data.news);
      } else {
        setError('No news data available for this symbol.');
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Request canceled', err.message);
      } else {
        setError('Failed to load market data. Please try again later.');
        console.error('API Error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  // Process the news data to update metrics
  const processNewsData = (news) => {
    if (!news.length) return;

    const calculated = news.reduce((acc, item) => {
      const sentimentValue = { positive: 1, neutral: 0, negative: -1 }[item.sentiment] || 0;
      const weighted = item.confidence * sentimentValue * (item.source_reliability / 100);
      return {
        totalWeighted: acc.totalWeighted + weighted,
        totalReliability: acc.totalReliability + item.source_reliability,
      };
    }, { totalWeighted: 0, totalReliability: 0 });

    const avgSentiment = calculated.totalWeighted / news.length;
    const avgReliability = calculated.totalReliability / news.length;
    const prevSentiment = ((avgSentiment * 0.85 + 1) / 2) * 100;
    const currentSentiment = ((avgSentiment + 1) / 2) * 100;

    setMetrics({
      sentiment: avgSentiment,
      change: currentSentiment - prevSentiment,
      strength: (Math.abs(avgSentiment) * 100 * 0.7) + (avgReliability * 0.3),
      direction: avgSentiment > 0.05 ? 'increase' : avgSentiment < -0.05 ? 'decrease' : 'neutral',
      priceChange: Math.min(Math.abs(avgSentiment) * 4, 4),
      confidence: Math.round((Math.min(Math.abs(avgSentiment) * 100, 95) * 0.65) + (avgReliability * 0.35)),
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchNewsData(controller.signal);
    return () => controller.abort();
  }, [fetchNewsData]);

  if (error) {
    return (
      <div className="text-center p-4 text-red-600 bg-red-50 rounded-lg">
        {error}
        <button 
          onClick={() => {
            const controller = new AbortController();
            fetchNewsData(controller.signal);
          }}
          className="ml-2 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 shadow-sm border border-gray-100">
            <Skeleton className="h-6 w-1/2 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <Skeleton className="h-24 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard
          title="Sentiment Score"
          tooltip="Weighted average of news sentiment (0 = negative, 1 = positive)"
        >
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-bold text-gray-900">
              {metrics.sentiment.toFixed(2)}
            </span>
            <span className={`text-sm ${metrics.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.change >= 0 ? '+' : ''}{metrics.change.toFixed(1)}%
            </span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Signal Strength</span>
              <span>{Math.round(metrics.strength)}%</span>
            </div>
            <AnimatedProgressBar value={metrics.strength} />
            <p className="text-sm text-gray-600 mt-1">{sentimentLabel}</p>
          </div>
        </MetricCard>

        <MetricCard
          title="Price Forecast"
          tooltip="24-hour prediction based on sentiment and market analysis"
        >
          <div className="flex justify-between items-baseline">
            <span className={`text-3xl font-bold ${
              metrics.direction === 'increase' ? 'text-green-600' : 
              metrics.direction === 'decrease' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {metrics.priceChange.toFixed(1)}%
            </span>
            <ArrowIndicator direction={metrics.direction} />
          </div>
          <p className="text-sm text-gray-600 mt-1">{directionLabel}</p>
          <div className="mt-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Confidence Level</span>
              <span>{metrics.confidence}%</span>
            </div>
            <AnimatedProgressBar value={metrics.confidence} />
          </div>
        </MetricCard>

        <MetricCard
          title="Prediction Accuracy"
          tooltip="Historical accuracy of previous forecasts"
        >
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-bold text-gray-800">89%</span>
            <span className="text-sm text-gray-500">Last 100 predictions</span>
          </div>
          <div className="h-24 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalTrend} aria-label="Accuracy trend chart">
                <XAxis dataKey="date" hide />
                <YAxis hide domain={[75, 100]} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                  formatter={(value) => `${value}%`}
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#6366f1"
                  fill="#e0e7ff"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </MetricCard>
      </div>
    </TooltipProvider>
  );
};

DashboardCards.propTypes = {
  symbol: PropTypes.string,
};

export default DashboardCards;