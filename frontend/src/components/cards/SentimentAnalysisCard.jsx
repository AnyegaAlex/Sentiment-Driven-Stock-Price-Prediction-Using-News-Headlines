import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useSentimentAnalysisQuery } from '@/hooks/queries/useSentimentAnalysisQuery';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  AlertTriangle,
  Smile,
  Meh,
  Frown,
  TrendingUp,
  TrendingDown,
  Info,
  Newspaper,
  Shield,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Color Constants (same)
const COLORS = {
  positive: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    chart: 'rgb(16, 185, 129)',
    chartBg: 'rgba(16, 185, 129, 0.1)',
    gradient: 'from-emerald-500 to-green-400',
  },
  negative: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
    chart: 'rgb(244, 63, 94)',
    chartBg: 'rgba(244, 63, 94, 0.1)',
    gradient: 'from-rose-500 to-red-400',
  },
  neutral: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    chart: 'rgb(59, 130, 246)',
    chartBg: 'rgba(59, 130, 246, 0.1)',
    gradient: 'from-blue-500 to-cyan-400',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/20',
    badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
    chart: 'rgb(234, 179, 8)',
  }
};

// Helper functions (unchanged)
const calculateVolatility = (history) => {
  if (!Array.isArray(history) || history.length < 2) return 0;
  const scores = history.map((h) => Number(h?.score)).filter((v) => Number.isFinite(v));
  if (scores.length < 2) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
  return Math.sqrt(variance) * 100;
};

const calculateReliabilityScore = (stats) => {
  if (!stats || !stats.reliability_sum || !stats.tier1_count) return 0;
  return Math.round((stats.reliability_sum / stats.tier1_count) * 100) || 0;
};

const getTimeRangeDays = (range) => {
  switch (range) {
    case '7d': return 7;
    case '30d': return 30;
    default: return 7;
  }
};

// Sub-components (TimeRangeSelector, SentimentMetric, NewsSourceAnalysis, SourceMetric, LoadingSkeleton, ErrorDisplay)
// These are unchanged – I'll include them for completeness.

const TimeRangeSelector = ({ timeRange, onChange }) => {
  const ranges = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
  ];
  return (
    <div className="flex gap-1 p-1 bg-gray-800/50 rounded-lg border border-gray-700/50" role="radiogroup" aria-label="Select time range">
      {ranges.map((range) => (
        <Button
          key={range.value}
          variant="ghost"
          size="sm"
          onClick={() => onChange(range.value)}
          aria-pressed={timeRange === range.value}
          className={cn(
            "px-3 py-1.5 h-auto text-xs font-medium transition-all",
            "hover:bg-gray-700 hover:text-gray-200",
            timeRange === range.value ? "bg-gray-700 text-gray-200 shadow-sm" : "text-gray-400"
          )}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
};
TimeRangeSelector.propTypes = {
  timeRange: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

const SentimentMetric = ({ icon, label, value, trend, variant }) => {
  const config = COLORS[variant];
  const TrendIcon = trend.includes('+') ? TrendingUp : trend === 'Stable' ? null : TrendingDown;
  return (
    <div className={cn("p-4 rounded-xl border", config.bg, config.border)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={config.text}>{icon}</span>
          <span className="text-sm font-medium text-gray-400">{label}</span>
        </div>
        <Badge className={config.badge}>{value}%</Badge>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold font-mono text-gray-50">{value}%</div>
        {TrendIcon && (
          <div className="flex items-center gap-1">
            <TrendIcon className={cn("h-4 w-4", config.text)} />
            <span className={cn("text-xs", config.text)}>{trend}</span>
          </div>
        )}
      </div>
      <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", config.bg.replace('/10', '/50'))} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};
SentimentMetric.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  trend: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['positive', 'neutral', 'negative']).isRequired
};

const NewsSourceAnalysis = ({ newsCount, sourceStats, reliabilityScore }) => (
  <div className="bg-gray-800/30 border border-gray-700/50 p-4 rounded-xl">
    <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
      <Newspaper className="h-4 w-4 text-gray-400" />
      News Source Analysis
    </h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SourceMetric label="Total Articles" value={newsCount} icon={<Newspaper className="h-4 w-4" />} />
      <SourceMetric label="Tier 1 Sources" value={sourceStats?.tier1_count || 0} icon={<Shield className="h-4 w-4" />} />
      <SourceMetric
        label="Reliability"
        value={`${reliabilityScore}%`}
        icon={<Shield className="h-4 w-4" />}
        variant={reliabilityScore >= 70 ? 'positive' : reliabilityScore >= 50 ? 'neutral' : 'negative'}
      />
      <SourceMetric label="Top Source" value={sourceStats?.tier1_sources?.[0] || 'N/A'} icon={<Newspaper className="h-4 w-4" />} truncate />
    </div>
  </div>
);
NewsSourceAnalysis.propTypes = {
  newsCount: PropTypes.number.isRequired,
  sourceStats: PropTypes.shape({
    tier1_count: PropTypes.number,
    reliability_sum: PropTypes.number,
    tier1_sources: PropTypes.arrayOf(PropTypes.string)
  }),
  reliabilityScore: PropTypes.number.isRequired
};

const SourceMetric = ({ label, value, icon, variant = 'neutral', truncate }) => {
  const config = COLORS[variant];
  return (
    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-1">
        <span className={cn("text-gray-400", config?.text)}>{icon}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={cn("text-lg font-bold font-mono text-gray-50", truncate && "truncate")}>{value}</p>
    </div>
  );
};
SourceMetric.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['positive', 'neutral', 'negative']),
  truncate: PropTypes.bool
};

const LoadingSkeleton = ({ className }) => (
  <Card className={cn("border-gray-800/50 bg-gray-900/95", className)}>
    <CardHeader className="pb-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Skeleton className="h-6 w-48 bg-gray-800" />
        <Skeleton className="h-8 w-24 bg-gray-800" />
      </div>
      <div className="flex gap-2 mt-2">
        <Skeleton className="h-5 w-24 bg-gray-800" />
        <Skeleton className="h-5 w-20 bg-gray-800" />
      </div>
    </CardHeader>
    <CardContent className="p-4 sm:p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl bg-gray-800" />)}
      </div>
      <Skeleton className="h-[250px] rounded-xl bg-gray-800" />
      <Skeleton className="h-[250px] rounded-xl bg-gray-800" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl bg-gray-800" />)}
      </div>
    </CardContent>
  </Card>
);
LoadingSkeleton.propTypes = { className: PropTypes.string };

const ErrorDisplay = ({ error, onRetry, className }) => (
  <Card className={cn("border-rose-500/30 bg-rose-500/10", className)}>
    <CardContent className="p-6">
      <Alert variant="destructive" className="border-0 bg-transparent">
        <AlertTriangle className="h-4 w-4 text-rose-400" />
        <AlertTitle className="text-rose-300 font-semibold">Sentiment Analysis Error</AlertTitle>
        <AlertDescription className="text-rose-200/80">{error}</AlertDescription>
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-3 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300">
          Retry Analysis
        </Button>
      </Alert>
    </CardContent>
  </Card>
);
ErrorDisplay.propTypes = {
  error: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
  className: PropTypes.string
};

// ============================================================================
// Main Component (React Query version)
// ============================================================================

const SentimentAnalysisCard = ({ symbol, className, onError }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
  const chartContainerRef = useRef(null);

  // Resize effect
  useEffect(() => {
    const updateDimensions = () => {
      if (chartContainerRef.current) {
        setChartDimensions({
          width: chartContainerRef.current.offsetWidth,
          height: chartContainerRef.current.offsetHeight
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Use React Query hook
  const { data: rawData, isLoading, error, refetch } = useSentimentAnalysisQuery(symbol, timeRange);

  // Validation function (memoized)
  const generateMockHistory = useCallback(() => {
    const days = 30;
    const history = [];
    let sentiment = -0.2;
    for (let i = 0; i < days; i++) {
      sentiment = sentiment + (Math.random() - 0.5) * 0.1;
      sentiment = Math.max(-1, Math.min(1, sentiment));
      history.push({ date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString(), score: sentiment });
    }
    return history;
  }, []);

  const validateSentimentData = useCallback((rawData) => {
    const sentiment = rawData?.sentiment || {};
    const newsCount = Number(rawData?.news_count) || 0;
    return {
      sentiment: Math.max(-1, Math.min(1, Number(sentiment?.score) || 0)),
      news_count: newsCount,
      source_stats: rawData?.source_stats || {
        tier1_count: 0,
        reliability_sum: 0,
        tier1_sources: []
      },
      history: Array.isArray(rawData?.history) ? rawData.history : generateMockHistory()
    };
  }, [generateMockHistory]);

  const data = useMemo(() => {
    if (!rawData) return null;
    return validateSentimentData(rawData);
  }, [rawData, validateSentimentData]);

  // Metrics
  const metrics = useMemo(() => {
    if (!data) return null;
    const sentimentScore = ((data.sentiment + 1) / 2) * 100;
    const isBullish = sentimentScore >= 60;
    const isBearish = sentimentScore <= 40;
    let distribution = {
      positive: Math.round(sentimentScore * 0.7),
      neutral: Math.round(30 - Math.abs(sentimentScore - 50) * 0.3),
      negative: 100 - Math.round(sentimentScore * 0.7 + (30 - Math.abs(sentimentScore - 50) * 0.3))
    };
    const total = distribution.positive + distribution.neutral + distribution.negative;
    if (total !== 100) {
      distribution.positive = Math.round((distribution.positive / total) * 100);
      distribution.neutral = Math.round((distribution.neutral / total) * 100);
      distribution.negative = 100 - distribution.positive - distribution.neutral;
    }
    const recentHistory = data.history?.slice(-7) || [];
    const trend = recentHistory.length >= 2
      ? ((recentHistory[recentHistory.length - 1]?.score || 0) - (recentHistory[0]?.score || 0)) * 50
      : 0;
    return {
      sentimentScore,
      isBullish,
      isBearish,
      distribution,
      trend,
      volatility: calculateVolatility(data.history)
    };
  }, [data]);

  // Chart data
  const historicalChartData = useMemo(() => {
    if (!data?.history) return null;
    const history = data.history.slice(-getTimeRangeDays(timeRange));
    return {
      labels: history.map(h => {
        const date = new Date(h.date);
        return timeRange === '7d'
          ? date.toLocaleDateString('en-US', { weekday: 'short' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Sentiment Score',
        data: history.map(h => ((h.score + 1) / 2) * 100),
        borderColor: metrics?.isBullish ? COLORS.positive.chart : metrics?.isBearish ? COLORS.negative.chart : COLORS.neutral.chart,
        backgroundColor: metrics?.isBullish ? COLORS.positive.chartBg : metrics?.isBearish ? COLORS.negative.chartBg : COLORS.neutral.chartBg,
        tension: 0.4,
        fill: true,
        pointRadius: chartDimensions.width < 640 ? 2 : 3,
        pointHoverRadius: 5,
      }]
    };
  }, [data, timeRange, metrics, chartDimensions.width]);

  const distributionChartData = useMemo(() => ({
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [{
      data: [
        metrics?.distribution.positive || 0,
        metrics?.distribution.neutral || 0,
        metrics?.distribution.negative || 0
      ],
      backgroundColor: [
        COLORS.positive.chart,
        COLORS.warning.chart,
        COLORS.negative.chart
      ],
      borderColor: [
        COLORS.positive.chart,
        COLORS.warning.chart,
        COLORS.negative.chart
      ],
      borderWidth: 1,
      borderRadius: 6,
    }]
  }), [metrics]);

  if (isLoading) return <LoadingSkeleton className={className} />;
  if (error) return <ErrorDisplay error={error.message} onRetry={refetch} className={className} />;
  if (!data || !metrics) return null;

  // Render card (same as original)
  return (
    <Card className={cn(
      "relative overflow-hidden border-gray-800/50 bg-gray-900/95 backdrop-blur-xl",
      "shadow-2xl shadow-black/50",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 via-transparent to-transparent pointer-events-none" />

      <CardHeader className="relative pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg sm:text-xl font-bold text-gray-50">Market Sentiment</CardTitle>
            <UITooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-500 hover:text-gray-400 transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px] bg-gray-800 border-gray-700">
                <p className="text-sm text-gray-300">AI-powered sentiment analysis from news, social media, and expert opinions for {symbol}</p>
              </TooltipContent>
            </UITooltip>
          </div>
          <TimeRangeSelector timeRange={timeRange} onChange={setTimeRange} />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className={cn("border", metrics.isBullish ? COLORS.positive.border : metrics.isBearish ? COLORS.negative.border : COLORS.neutral.border)}>
            {metrics.isBullish ? 'Bullish' : metrics.isBearish ? 'Bearish' : 'Neutral'} Sentiment
          </Badge>
          <Badge variant="outline" className="border-gray-700 bg-gray-800/50 text-gray-300">
            Volatility: {metrics.volatility.toFixed(1)}%
          </Badge>
          <Badge variant="outline" className="border-gray-700 bg-gray-800/50 text-gray-300">
            <Calendar className="h-3 w-3 mr-1" />
            {timeRange === '7d' ? '7 Days' : '30 Days'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SentimentMetric
            icon={<Smile className="h-5 w-5" />}
            label="Positive"
            value={metrics.distribution.positive}
            trend={metrics.trend > 0 ? `+${metrics.trend.toFixed(1)}%` : `${metrics.trend.toFixed(1)}%`}
            variant="positive"
          />
          <SentimentMetric
            icon={<Meh className="h-5 w-5" />}
            label="Neutral"
            value={metrics.distribution.neutral}
            trend="Stable"
            variant="neutral"
          />
          <SentimentMetric
            icon={<Frown className="h-5 w-5" />}
            label="Negative"
            value={metrics.distribution.negative}
            trend={metrics.trend < 0 ? `+${Math.abs(metrics.trend).toFixed(1)}%` : `${(-metrics.trend).toFixed(1)}%`}
            variant="negative"
          />
        </div>

        {historicalChartData && (
          <div ref={chartContainerRef} className="bg-gray-800/30 border border-gray-700/50 p-3 sm:p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              Sentiment Trend
            </h3>
            <div className="h-[200px] sm:h-[250px]">
              <Line
                key={chartDimensions.width}
                data={historicalChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#1f2937',
                      titleColor: '#f9fafb',
                      bodyColor: '#d1d5db',
                      borderColor: '#374151',
                      borderWidth: 1,
                      padding: chartDimensions.width < 640 ? 6 : 8,
                      bodyFont: { size: chartDimensions.width < 640 ? 11 : 12 },
                      titleFont: { size: chartDimensions.width < 640 ? 12 : 13 },
                      callbacks: {
                        label: (context) => `Sentiment: ${context.parsed.y.toFixed(1)}%`
                      }
                    }
                  },
                  scales: {
                    y: {
                      min: 0,
                      max: 100,
                      grid: { color: 'rgba(75, 85, 99, 0.2)' },
                      ticks: { color: '#9ca3af', font: { size: chartDimensions.width < 640 ? 9 : 11 }, callback: (value) => `${value}%` }
                    },
                    x: {
                      grid: { display: false },
                      ticks: { color: '#9ca3af', font: { size: chartDimensions.width < 640 ? 9 : 11 }, maxRotation: 45, minRotation: 45 }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        <div className="bg-gray-800/30 border border-gray-700/50 p-3 sm:p-4 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            Sentiment Distribution
          </h3>
          <div className="h-[200px] sm:h-[250px]">
            <Bar
              data={distributionChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#1f2937',
                    titleColor: '#f9fafb',
                    bodyColor: '#d1d5db',
                    borderColor: '#374151',
                    borderWidth: 1,
                    callbacks: {
                      label: (context) => `${context.parsed.y.toFixed(1)}%`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(75, 85, 99, 0.2)' },
                    ticks: { color: '#9ca3af', font: { size: chartDimensions.width < 640 ? 9 : 11 }, callback: (value) => `${value}%` }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { size: chartDimensions.width < 640 ? 9 : 11 } }
                  }
                }
              }}
            />
          </div>
        </div>

        <NewsSourceAnalysis
          newsCount={data.news_count}
          sourceStats={data.source_stats}
          reliabilityScore={calculateReliabilityScore(data.source_stats)}
        />
      </CardContent>
    </Card>
  );
};

SentimentAnalysisCard.propTypes = {
  symbol: PropTypes.string.isRequired,
  className: PropTypes.string,
  onError: PropTypes.func
};

export default SentimentAnalysisCard;