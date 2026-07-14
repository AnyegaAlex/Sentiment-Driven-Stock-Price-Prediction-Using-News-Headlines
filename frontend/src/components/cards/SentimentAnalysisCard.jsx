/**
 * SentimentAnalysisCard
 *
 * Displays market sentiment analysis with interactive charts, metrics,
 * and a list of recent news headlines.
 *
 * @component
 * @param {Object} props
 * @param {string} props.symbol - Stock ticker symbol for analysis
 * @param {string} [props.className] - Additional CSS classes
 * @param {function} [props.onError] - Error callback handler
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useSentimentAnalysisQuery } from '@/hooks/queries/useSentimentAnalysisQuery';
import { useNewsQuery } from '@/hooks/queries/useNewsQuery';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  COLOR_SCHEMES,
  calculateVolatility,
  calculateReliabilityScore,
  getChartOptions,
  CardWrapper,
  CardSkeleton,
  CardError,
  getTimeRangeDays,
} from './shared/utils.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const SENTIMENT_ICONS = {
  positive: Smile,
  neutral: Meh,
  negative: Frown,
};

const TIME_RANGE_OPTIONS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
];

const TimeRangeSelector = ({ timeRange, onChange }) => (
  <div
    className="flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800"
    role="radiogroup"
    aria-label="Select time range"
  >
    {TIME_RANGE_OPTIONS.map((option) => (
      <Button
        key={option.value}
        variant="ghost"
        size="sm"
        onClick={() => onChange(option.value)}
        aria-pressed={timeRange === option.value}
        className={cn(
          'min-h-[36px] px-3 py-1.5 text-xs font-medium transition-all sm:min-h-[44px] sm:px-4 sm:text-sm',
          'hover:bg-gray-200 dark:hover:bg-gray-700',
          timeRange === option.value
            ? 'bg-gray-200 text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
            : 'text-gray-500 dark:text-gray-400'
        )}
      >
        {option.label}
      </Button>
    ))}
  </div>
);

TimeRangeSelector.propTypes = {
  timeRange: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const SentimentMetric = ({ icon: Icon, label, value, trend, variant }) => {
  const config = COLOR_SCHEMES[variant];
  const TrendIcon = trend.includes('+') ? TrendingUp : trend === 'Stable' ? null : TrendingDown;

  return (
    <div className={cn('rounded-xl border p-3 transition-colors sm:p-4', config.bg, config.border, config.hover)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', config.text)} aria-hidden="true" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 sm:text-sm">{label}</span>
        </div>
        <Badge className={cn('text-xs font-medium', config.badge)}>{value}%</Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold text-gray-900 dark:text-gray-50 sm:text-2xl font-mono">{value}%</span>
        {TrendIcon && (
          <div className="flex items-center gap-1">
            <TrendIcon className={cn('h-3 w-3 sm:h-4 sm:w-4', config.text)} aria-hidden="true" />
            <span className={cn('text-xs font-medium', config.text)}>{trend}</span>
          </div>
        )}
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', config.bg.replace('/30', '/50'))}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
};

SentimentMetric.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  trend: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['positive', 'neutral', 'negative']).isRequired,
};

const SourceMetric = ({ label, value, icon: Icon, variant = 'neutral', truncate }) => {
  const config = COLOR_SCHEMES[variant];

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 sm:p-3 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="mb-1 flex items-center gap-2">
        <Icon className={cn('h-3 w-3 sm:h-4 sm:w-4', config?.text || 'text-gray-400')} aria-hidden="true" />
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className={cn('text-base font-bold text-gray-900 dark:text-gray-50 sm:text-lg font-mono', truncate && 'truncate')} title={typeof value === 'string' ? value : String(value)}>
        {value}
      </p>
    </div>
  );
};

SourceMetric.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType.isRequired,
  variant: PropTypes.oneOf(['positive', 'neutral', 'negative']),
  truncate: PropTypes.bool,
};

const NewsSourceAnalysis = ({ newsCount, sourceStats, reliabilityScore }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4 dark:border-gray-700/50 dark:bg-gray-800/30">
    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 sm:text-sm">
      <Newspaper className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
      News Source Analysis
    </h3>
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <SourceMetric label="Total Articles" value={newsCount} icon={Newspaper} />
      <SourceMetric label="Tier 1 Sources" value={sourceStats?.tier1_count || 0} icon={Shield} />
      <SourceMetric
        label="Reliability"
        value={`${reliabilityScore}%`}
        icon={Shield}
        variant={reliabilityScore >= 70 ? 'positive' : reliabilityScore >= 50 ? 'neutral' : 'negative'}
      />
      <SourceMetric
        label="Top Source"
        value={sourceStats?.tier1_sources?.[0] || 'N/A'}
        icon={Newspaper}
        truncate
      />
    </div>
  </div>
);

NewsSourceAnalysis.propTypes = {
  newsCount: PropTypes.number.isRequired,
  sourceStats: PropTypes.shape({
    tier1_count: PropTypes.number,
    reliability_sum: PropTypes.number,
    tier1_sources: PropTypes.arrayOf(PropTypes.string),
  }),
  reliabilityScore: PropTypes.number.isRequired,
};

// ============================================================================
// Recent News List
// ============================================================================

const RecentNewsList = ({ symbol }) => {
  const { data: newsData, isLoading, error } = useNewsQuery(symbol);

  // Normalize data: extract news array
  const news = useMemo(() => {
    if (!newsData) return [];
    // The API might return { news: [...] } or directly an array
    if (Array.isArray(newsData)) return newsData;
    if (newsData?.news) return newsData.news;
    return [];
  }, [newsData]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !news.length) {
    return <div className="text-xs text-gray-500 dark:text-gray-400">No recent news available</div>;
  }

  const headlines = news.slice(0, 3);

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">Recent News</h4>
      <div className="space-y-1.5">
        {headlines.map((item, idx) => (
          <a
            key={idx}
            href={item.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-700/50"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                {item.title || 'Untitled'}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                <span>{item.source || 'Unknown'}</span>
                <span className="h-1 w-1 rounded-full bg-gray-400" />
                <span>{item.date ? new Date(item.date).toLocaleDateString() : ''}</span>
              </div>
            </div>
            <ExternalLink className="h-3 w-3 flex-shrink-0 text-gray-400" />
          </a>
        ))}
      </div>
    </div>
  );
};

RecentNewsList.propTypes = {
  symbol: PropTypes.string.isRequired,
};

// ============================================================================
// Main Component
// ============================================================================

const SentimentAnalysisCard = ({ symbol, className, onError }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
  const chartContainerRef = useRef(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (chartContainerRef.current) {
        setChartDimensions({
          width: chartContainerRef.current.offsetWidth,
          height: chartContainerRef.current.offsetHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const { data: rawData, isLoading, error, refetch } = useSentimentAnalysisQuery(symbol, timeRange);

  const validateSentimentData = useCallback((responseData) => {
    const apiData = responseData?.data || responseData || {};
    const sentiment = apiData?.sentiment || {};
    const newsCount = Number(apiData?.news_count) || 0;

    return {
      sentiment: Math.max(-1, Math.min(1, Number(sentiment?.score) || 0)),
      sentimentLabel: sentiment?.label || 'Neutral',
      newsCount,
      sourceStats: apiData?.source_stats || { tier1_count: 0, reliability_sum: 0, tier1_sources: [] },
      history: Array.isArray(apiData?.history) ? apiData.history : [],
    };
  }, []);

  const data = useMemo(() => (rawData ? validateSentimentData(rawData) : null), [rawData, validateSentimentData]);

  const metrics = useMemo(() => {
    if (!data) return null;

    const sentimentScore = ((data.sentiment + 1) / 2) * 100;
    const isBullish = sentimentScore >= 60;
    const isBearish = sentimentScore <= 40;

    let distribution = {
      positive: Math.round(sentimentScore * 0.7),
      neutral: Math.round(30 - Math.abs(sentimentScore - 50) * 0.3),
      negative: 100 - Math.round(sentimentScore * 0.7 + (30 - Math.abs(sentimentScore - 50) * 0.3)),
    };

    const total = distribution.positive + distribution.neutral + distribution.negative;
    if (total !== 100 && total > 0) {
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
      volatility: calculateVolatility(data.history),
    };
  }, [data]);

  const historicalChartData = useMemo(() => {
    if (!data?.history) return null;
    const history = data.history.slice(-getTimeRangeDays(timeRange));
    const isMobile = chartDimensions.width < 640;

    return {
      labels: history.map((item) => {
        const date = new Date(item.date);
        return timeRange === '7d'
          ? date.toLocaleDateString('en-US', { weekday: 'short' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Sentiment Score',
          data: history.map((item) => ((item.score + 1) / 2) * 100),
          borderColor: metrics?.isBullish ? COLOR_SCHEMES.positive.chart : metrics?.isBearish ? COLOR_SCHEMES.negative.chart : COLOR_SCHEMES.neutral.chart,
          backgroundColor: metrics?.isBullish ? COLOR_SCHEMES.positive.chartBg : metrics?.isBearish ? COLOR_SCHEMES.negative.chartBg : COLOR_SCHEMES.neutral.chartBg,
          tension: 0.4,
          fill: true,
          pointRadius: isMobile ? 2 : 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [data, timeRange, metrics, chartDimensions.width]);

  const distributionChartData = useMemo(
    () => ({
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [
        {
          data: [metrics?.distribution.positive || 0, metrics?.distribution.neutral || 0, metrics?.distribution.negative || 0],
          backgroundColor: [COLOR_SCHEMES.positive.chart, COLOR_SCHEMES.warning.chart, COLOR_SCHEMES.negative.chart],
          borderColor: [COLOR_SCHEMES.positive.chart, COLOR_SCHEMES.warning.chart, COLOR_SCHEMES.negative.chart],
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }),
    [metrics]
  );

  const handleError = useCallback(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  useEffect(handleError, [handleError]);

  if (isLoading) {
    return (
      <CardSkeleton className={className}>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-6 w-48 bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-11 w-24 bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Skeleton className="h-5 w-24 bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-5 w-20 bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-5 w-24 bg-gray-200 dark:bg-gray-800" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-[100px] rounded-xl bg-gray-200 dark:bg-gray-800" />
            ))}
          </div>
          <Skeleton className="h-[200px] rounded-xl bg-gray-200 dark:bg-gray-800 sm:h-[250px]" />
          <Skeleton className="h-[200px] rounded-xl bg-gray-200 dark:bg-gray-800 sm:h-[250px]" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-20 rounded-lg bg-gray-200 dark:bg-gray-800" />
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-12 w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-12 w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-12 w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>
        </CardContent>
      </CardSkeleton>
    );
  }

  if (error) {
    return <CardError error={error} onRetry={refetch} className={className} title="Sentiment Analysis Error" />;
  }

  if (!data || !metrics) return null;

  const sentimentVariant = metrics.isBullish ? 'positive' : metrics.isBearish ? 'negative' : 'neutral';
  const sentimentLabel = metrics.isBullish ? 'Bullish' : metrics.isBearish ? 'Bearish' : 'Neutral';
  const SentimentIcon = SENTIMENT_ICONS[sentimentVariant];

  return (
    <CardWrapper className={className}>
      <CardHeader className="relative pb-2 sm:pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <SentimentIcon className={cn('h-5 w-5 sm:h-6 sm:w-6', COLOR_SCHEMES[sentimentVariant].text)} aria-hidden="true" />
            <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-50 sm:text-lg lg:text-xl">
              Market Sentiment
            </CardTitle>
            <UITooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="More information about sentiment analysis"
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px] border-gray-800 bg-gray-900 text-gray-100">
                <p className="text-sm">AI-powered sentiment analysis from news, social media, and expert opinions for {symbol}</p>
              </TooltipContent>
            </UITooltip>
          </div>
          <TimeRangeSelector timeRange={timeRange} onChange={setTimeRange} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('border-2', COLOR_SCHEMES[sentimentVariant].border)}>
            {sentimentLabel} Sentiment
          </Badge>
          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
            Volatility: {metrics.volatility.toFixed(1)}%
          </Badge>
          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
            <Calendar className="mr-1 h-3 w-3" aria-hidden="true" />
            {timeRange === '7d' ? '7 Days' : '30 Days'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-3 p-3 sm:space-y-4 sm:p-4">
        {/* Sentiment Metrics – Stacked vertically */}
        <div className="grid grid-cols-1 gap-2 sm:gap-3">
          <SentimentMetric
            icon={Smile}
            label="Positive"
            value={metrics.distribution.positive}
            trend={metrics.trend > 0 ? `+${metrics.trend.toFixed(1)}%` : `${metrics.trend.toFixed(1)}%`}
            variant="positive"
          />
          <SentimentMetric icon={Meh} label="Neutral" value={metrics.distribution.neutral} trend="Stable" variant="neutral" />
          <SentimentMetric
            icon={Frown}
            label="Negative"
            value={metrics.distribution.negative}
            trend={metrics.trend < 0 ? `+${Math.abs(metrics.trend).toFixed(1)}%` : `${(-metrics.trend).toFixed(1)}%`}
            variant="negative"
          />
        </div>

        {historicalChartData && (
          <div ref={chartContainerRef} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700/50 dark:bg-gray-800/30">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 sm:text-sm">
              <TrendingUp className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
              Sentiment Trend
            </h3>
            <div className="h-[180px] sm:h-[220px] lg:h-[250px]">
              <Line key={chartDimensions.width} data={historicalChartData} options={getChartOptions(chartDimensions.width)} />
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700/50 dark:bg-gray-800/30">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 sm:text-sm">
            <BarChart3 className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            Sentiment Distribution
          </h3>
          <div className="h-[180px] sm:h-[220px] lg:h-[250px]">
            <Bar
              data={distributionChartData}
              options={getChartOptions(chartDimensions.width, {
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(75, 85, 99, 0.15)' },
                    ticks: {
                      color: '#6b7280',
                      font: { size: chartDimensions.width < 640 ? 9 : 11 },
                      callback: (value) => `${value}%`,
                    },
                  },
                },
              })}
            />
          </div>
        </div>

        <NewsSourceAnalysis
          newsCount={data.newsCount}
          sourceStats={data.sourceStats}
          reliabilityScore={calculateReliabilityScore(data.sourceStats)}
        />

        {/* Recent News Section */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700/50 dark:bg-gray-800/30">
          <RecentNewsList symbol={symbol} />
        </div>
      </CardContent>
    </CardWrapper>
  );
};

SentimentAnalysisCard.propTypes = {
  symbol: PropTypes.string.isRequired,
  className: PropTypes.string,
  onError: PropTypes.func,
};

export default SentimentAnalysisCard;