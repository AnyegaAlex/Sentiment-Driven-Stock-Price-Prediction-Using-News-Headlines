import React, { useState, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTechnicalIndicatorsQuery } from '@/hooks/queries/useTechnicalIndicatorsQuery';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Legend,
  Filler,
  Tooltip as ChartTooltip
} from 'chart.js';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { 
  ArrowUp, 
  ArrowDown, 
  Gauge, 
  CandlestickChart,
  TrendingUp,
  TrendingDown,
  Info,
  AlertCircle,
  BarChart3,
  Layers,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Legend,
  Filler,
  ChartTooltip
);

// Color Constants (same as before)
const COLORS = {
  positive: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    chart: 'rgb(16, 185, 129)',
    chartBg: 'rgba(16, 185, 129, 0.1)'
  },
  negative: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
    chart: 'rgb(244, 63, 94)',
    chartBg: 'rgba(244, 63, 94, 0.1)'
  },
  neutral: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    chart: 'rgb(59, 130, 246)',
    chartBg: 'rgba(59, 130, 246, 0.1)'
  },
  warning: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/20',
    badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
    chart: 'rgb(234, 179, 8)'
  }
};

// Sub-components (TimeframeSelector, TrendIndicator, MomentumIndicator, KeyLevels, LevelCard, PivotPoints, PivotPoint, LoadingSkeleton, ErrorDisplay)
// These are unchanged from your original – I'll include them for completeness, but they are exactly the same.

const TimeframeSelector = ({ timeframe, onChange }) => {
  const timeframes = [
    { value: '1d', label: '1D' },
    { value: '1w', label: '1W' },
    { value: '1m', label: '1M' },
    { value: '3m', label: '3M' },
  ];
  return (
    <div className="flex gap-1.5 p-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
      {timeframes.map((tf) => (
        <Button
          key={tf.value}
          variant="ghost"
          size="sm"
          onClick={() => onChange(tf.value)}
          className={cn(
            "px-4 py-2 h-auto text-sm lg:text-base font-medium transition-all",
            "hover:bg-gray-700 hover:text-gray-200",
            timeframe === tf.value ? "bg-gray-700 text-gray-200 shadow-sm" : "text-gray-400"
          )}
        >
          {tf.label}
        </Button>
      ))}
    </div>
  );
};
TimeframeSelector.propTypes = {
  timeframe: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

const TrendIndicator = ({ isUptrend, sma50, sma200, strength }) => {
  const config = isUptrend ? COLORS.positive : COLORS.negative;
  const Icon = isUptrend ? TrendingUp : TrendingDown;
  return (
    <div className={cn("p-5 lg:p-6 xl:p-7 rounded-xl border", config.bg, config.border)}>
      <div className="flex items-center justify-between mb-4 lg:mb-5">
        <div className="flex items-center gap-3">
          <CandlestickChart className={cn("h-5 w-5 lg:h-6 lg:w-6", config.text)} />
          <span className="text-base lg:text-lg font-medium text-gray-400">Trend</span>
        </div>
        <Badge className={cn("px-3 py-1.5 text-sm lg:text-base", config.badge)}>
          <Icon className="h-4 w-4 lg:h-5 lg:w-5 mr-1.5" />
          {isUptrend ? 'Uptrend' : 'Downtrend'}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:gap-5">
        <div>
          <div className="text-sm lg:text-base text-gray-500 mb-2">SMA 50</div>
          <div className="text-xl lg:text-2xl xl:text-3xl font-bold font-mono text-gray-50">${sma50.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm lg:text-base text-gray-500 mb-2">SMA 200</div>
          <div className="text-xl lg:text-2xl xl:text-3xl font-bold font-mono text-gray-50">${sma200.toFixed(2)}</div>
        </div>
      </div>
      <div className="mt-4 lg:mt-5 pt-4 lg:pt-5 border-t border-gray-700/50">
        <div className="flex justify-between text-sm lg:text-base mb-2">
          <span className="text-gray-500">Trend Strength</span>
          <span className={config.text}>{strength.toFixed(1)}%</span>
        </div>
        <div className="h-2 lg:h-3 bg-gray-700 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", config.bg.replace('/10', '/50'))} style={{ width: `${Math.min(strength, 100)}%` }} />
        </div>
      </div>
    </div>
  );
};
TrendIndicator.propTypes = {
  isUptrend: PropTypes.bool.isRequired,
  sma50: PropTypes.number.isRequired,
  sma200: PropTypes.number.isRequired,
  strength: PropTypes.number.isRequired
};

const MomentumIndicator = ({ rsi, isOversold, isOverbought }) => {
  const getConfig = () => {
    if (isOversold) return COLORS.positive;
    if (isOverbought) return COLORS.negative;
    return COLORS.neutral;
  };
  const config = getConfig();
  const status = isOversold ? 'Oversold' : isOverbought ? 'Overbought' : 'Neutral';
  return (
    <div className={cn("p-5 lg:p-6 xl:p-7 rounded-xl border", config.bg, config.border)}>
      <div className="flex items-center justify-between mb-4 lg:mb-5">
        <div className="flex items-center gap-3">
          <Gauge className={cn("h-5 w-5 lg:h-6 lg:w-6", config.text)} />
          <span className="text-base lg:text-lg font-medium text-gray-400">Momentum</span>
        </div>
        <Badge className={cn("px-3 py-1.5 text-sm lg:text-base", config.badge)}>
          {status}
        </Badge>
      </div>
      <div className="space-y-3 lg:space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm lg:text-base text-gray-500">RSI (14)</span>
          <span className={cn("text-xl lg:text-2xl xl:text-3xl font-bold font-mono", config.text)}>{rsi.toFixed(1)}</span>
        </div>
        <div className="relative h-2.5 lg:h-3 bg-gray-700 rounded-full overflow-hidden">
          <div className={cn("absolute top-0 left-0 h-full rounded-full transition-all", config.bg.replace('/10', '/50'))} style={{ width: `${rsi}%` }} />
        </div>
        <div className="flex justify-between text-xs lg:text-sm text-gray-500">
          <span>Oversold (30)</span>
          <span>Neutral</span>
          <span>Overbought (70)</span>
        </div>
      </div>
    </div>
  );
};
MomentumIndicator.propTypes = {
  rsi: PropTypes.number.isRequired,
  isOversold: PropTypes.bool.isRequired,
  isOverbought: PropTypes.bool.isRequired
};

const KeyLevels = ({ current, support, resistance, distances }) => (
  <div className="p-5 lg:p-6 xl:p-7 rounded-xl bg-gray-800/30 border border-gray-700/50">
    <h3 className="text-base lg:text-lg font-semibold text-gray-300 mb-4 lg:mb-5 flex items-center gap-2">
      <Layers className="h-5 w-5 lg:h-6 lg:w-6 text-gray-400" />
      Key Support & Resistance
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5 xl:gap-6">
      <LevelCard label="Current Price" value={current} type="current" distance={0} />
      <LevelCard label="Support" value={support} type="support" distance={distances.support} />
      <LevelCard label="Resistance" value={resistance} type="resistance" distance={distances.resistance} />
    </div>
  </div>
);
KeyLevels.propTypes = {
  current: PropTypes.number.isRequired,
  support: PropTypes.number.isRequired,
  resistance: PropTypes.number.isRequired,
  distances: PropTypes.shape({
    support: PropTypes.number.isRequired,
    resistance: PropTypes.number.isRequired
  }).isRequired
};

const LevelCard = ({ label, value, type, distance }) => {
  const config = {
    current: { icon: BarChart3, color: COLORS.neutral },
    support: { icon: ArrowUp, color: COLORS.positive },
    resistance: { icon: ArrowDown, color: COLORS.negative }
  }[type];
  const Icon = config.icon;
  const isAbove = distance > 0;
  return (
    <div className="p-4 lg:p-5 rounded-lg bg-gray-800/50 border border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4 lg:h-5 lg:w-5", config.color.text)} />
          <span className="text-sm lg:text-base text-gray-400">{label}</span>
        </div>
        {type !== 'current' && (
          <Badge className={cn("text-xs lg:text-sm", isAbove ? COLORS.positive.badge : COLORS.negative.badge)}>
            {isAbove ? '+' : ''}{distance.toFixed(1)}%
          </Badge>
        )}
      </div>
      <div className="text-xl lg:text-2xl xl:text-3xl font-bold font-mono text-gray-50">${value.toFixed(2)}</div>
    </div>
  );
};
LevelCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  type: PropTypes.oneOf(['current', 'support', 'resistance']).isRequired,
  distance: PropTypes.number.isRequired
};

const PivotPoints = ({ pivot, support, resistance, current, distance }) => {
  const range = resistance - support;
  const levels = [
    { label: 'R2', value: pivot + range, type: 'resistance' },
    { label: 'R1', value: pivot + (range * 0.5), type: 'resistance' },
    { label: 'Pivot', value: pivot, type: 'pivot' },
    { label: 'S1', value: pivot - (range * 0.5), type: 'support' },
    { label: 'S2', value: pivot - range, type: 'support' },
  ];
  return (
    <div className="p-5 lg:p-6 xl:p-7 rounded-xl bg-gray-800/30 border border-gray-700/50">
      <h3 className="text-base lg:text-lg font-semibold text-gray-300 mb-4 lg:mb-5 flex items-center gap-2">
        <Zap className="h-5 w-5 lg:h-6 lg:w-6 text-gray-400" />
        Pivot Points
      </h3>
      <div className="relative">
        <div className="flex sm:grid sm:grid-cols-5 gap-3 lg:gap-4 overflow-x-auto pb-3 sm:pb-0 scrollbar-thin scrollbar-thumb-gray-600">
          {levels.map((level) => (
            <PivotPoint key={level.label} label={level.label} value={level.value} current={current} type={level.type} className="flex-shrink-0 w-[140px] sm:w-auto" />
          ))}
        </div>
      </div>
      <div className="mt-4 lg:mt-5 pt-4 lg:pt-5 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-sm lg:text-base">
          <span className="text-gray-500">Current Position</span>
          <Badge className={cn("px-3 py-1.5 text-sm lg:text-base", distance >= 0 ? COLORS.positive.badge : COLORS.negative.badge)}>
            {distance >= 0 ? '+' : ''}{distance.toFixed(1)}% from pivot
          </Badge>
        </div>
      </div>
    </div>
  );
};
PivotPoints.propTypes = {
  pivot: PropTypes.number.isRequired,
  support: PropTypes.number.isRequired,
  resistance: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  distance: PropTypes.number.isRequired
};

const PivotPoint = ({ label, value, current, type, className }) => {
  const config = {
    resistance: COLORS.negative,
    support: COLORS.positive,
    pivot: COLORS.neutral
  }[type];
  const distance = ((current - value) / value) * 100;
  const isAbove = distance > 0;
  return (
    <div className={cn("p-4 lg:p-5 rounded-lg border", config.bg, config.border, className)}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm lg:text-base font-medium text-gray-400">{label}</span>
        <Badge className={cn("text-xs lg:text-sm px-2 py-1", isAbove ? COLORS.positive.badge : COLORS.negative.badge)}>
          {isAbove ? 'Above' : 'Below'}
        </Badge>
      </div>
      <div className="text-lg lg:text-xl xl:text-2xl font-bold font-mono text-gray-50">${value.toFixed(2)}</div>
      <div className={cn("text-xs lg:text-sm mt-2", config.text)}>
        {distance >= 0 ? '+' : ''}{distance.toFixed(1)}%
      </div>
    </div>
  );
};
PivotPoint.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  type: PropTypes.oneOf(['support', 'resistance', 'pivot']).isRequired,
  className: PropTypes.string
};

const LoadingSkeleton = ({ className }) => (
  <Card className={cn("border-gray-800/50 bg-gray-900/95 w-full max-w-7xl xl:max-w-[90rem] mx-auto", className)}>
    <CardHeader className="pb-4 lg:pb-6 px-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 lg:gap-6">
        <Skeleton className="h-7 w-48 lg:h-8 lg:w-56 bg-gray-800" />
        <Skeleton className="h-10 w-36 lg:h-12 lg:w-40 bg-gray-800" />
      </div>
      <div className="flex gap-3 mt-3 lg:mt-4">
        <Skeleton className="h-6 w-28 lg:h-7 lg:w-32 bg-gray-800" />
        <Skeleton className="h-6 w-32 lg:h-7 lg:w-36 bg-gray-800" />
      </div>
    </CardHeader>
    <CardContent className="p-4 sm:p-6 lg:p-8 xl:p-10 space-y-6 lg:space-y-8">
      <Skeleton className="h-[250px] sm:h-[300px] lg:h-[350px] xl:h-[400px] rounded-2xl bg-gray-800" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 xl:gap-8">
        <Skeleton className="h-48 lg:h-56 xl:h-64 rounded-xl bg-gray-800" />
        <Skeleton className="h-48 lg:h-56 xl:h-64 rounded-xl bg-gray-800" />
      </div>
      <Skeleton className="h-48 lg:h-56 xl:h-64 rounded-xl bg-gray-800" />
      <div className="space-y-4 lg:space-y-5">
        <Skeleton className="h-6 w-32 lg:h-7 lg:w-36 bg-gray-800" />
        <div className="flex sm:grid sm:grid-cols-5 gap-3 lg:gap-4 overflow-x-auto pb-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-[140px] sm:w-auto flex-shrink-0 rounded-lg bg-gray-800" />)}
        </div>
      </div>
    </CardContent>
  </Card>
);
LoadingSkeleton.propTypes = { className: PropTypes.string };

const ErrorDisplay = ({ error, onRetry, className }) => (
  <Card className={cn("border-rose-500/30 bg-rose-500/10 w-full max-w-7xl xl:max-w-[90rem] mx-auto", className)}>
    <CardContent className="p-6 lg:p-8 xl:p-10">
      <Alert variant="destructive" className="border-0 bg-transparent">
        <AlertCircle className="h-5 w-5 lg:h-6 lg:w-6 text-rose-400" />
        <AlertTitle className="text-lg lg:text-xl text-rose-300 font-semibold">Technical Analysis Error</AlertTitle>
        <AlertDescription className="text-base lg:text-lg text-rose-200/80">{error}</AlertDescription>
        <Button variant="outline" size="lg" onClick={onRetry} className="mt-4 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-base lg:text-lg px-6 py-3">
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

const TechnicalIndicatorsCard = ({ symbol, className, onError }) => {
  const [timeframe, setTimeframe] = useState('1d');
  const chartContainerRef = useRef(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });

  // Resize observer effect
  React.useEffect(() => {
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
  const { data, isLoading, error, refetch } = useTechnicalIndicatorsQuery(symbol, timeframe);

  // Derived indicators
  const indicators = useMemo(() => {
    if (!data?.technical) return null;
    const tech = data.technical;
    const isUptrend = tech.sma_50 > tech.sma_200;
    const isOversold = tech.rsi < 30;
    const isOverbought = tech.rsi > 70;
    const distanceToSupport = ((tech.current_price - tech.support) / tech.support) * 100;
    const distanceToResistance = ((tech.resistance - tech.current_price) / tech.current_price) * 100;
    const distanceToPivot = ((tech.current_price - tech.pivot) / tech.pivot) * 100;
    const trendStrength = Math.abs(tech.sma_50 - tech.sma_200) / tech.sma_200 * 100;
    const volatilityLevel = tech.volatility > 0.2 ? 'high' : tech.volatility > 0.1 ? 'medium' : 'low';
    return {
      isUptrend,
      isOversold,
      isOverbought,
      distanceToSupport,
      distanceToResistance,
      distanceToPivot,
      trendStrength,
      volatilityLevel
    };
  }, [data]);

  // Chart data
  const chartData = useMemo(() => {
    if (!data?.technical?.price_history) return null;
    const history = data.technical.price_history;
    const labels = history.map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (history.length - 1 - i));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    return {
      labels,
      datasets: [
        {
          label: 'Price',
          data: history,
          borderColor: COLORS.neutral.chart,
          backgroundColor: COLORS.neutral.chartBg,
          tension: 0.1,
          pointRadius: chartDimensions.width < 640 ? 1 : 2,
          pointHoverRadius: 4,
          fill: true,
        },
        {
          label: 'SMA 50',
          data: history.map(() => data.technical.sma_50),
          borderColor: COLORS.warning.chart,
          borderDash: [5, 5],
          tension: 0,
          pointRadius: 0,
        },
        {
          label: 'SMA 200',
          data: history.map(() => data.technical.sma_200),
          borderColor: COLORS.negative.chart,
          borderDash: [5, 5],
          tension: 0,
          pointRadius: 0,
        }
      ]
    };
  }, [data, chartDimensions.width]);

  if (isLoading) return <LoadingSkeleton className={className} />;
  if (error) return <ErrorDisplay error={error.message} onRetry={refetch} className={className} />;
  if (!data || !indicators) return null;

  const tech = data.technical;

  // Render the card (same as original)
  return (
    <Card className={cn(
      "relative overflow-hidden border-gray-800/50 bg-gray-900/95 backdrop-blur-xl",
      "shadow-2xl shadow-black/50 w-full max-w-7xl xl:max-w-[90rem] mx-auto",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 via-transparent to-transparent pointer-events-none" />

      <CardHeader className="relative pb-4 lg:pb-6 px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 lg:gap-6">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-50">Technical Analysis</CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-5 w-5 lg:h-6 lg:w-6 text-gray-500 hover:text-gray-400 transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[350px] bg-gray-800 border-gray-700 p-3 lg:p-4">
                <p className="text-sm lg:text-base text-gray-300">Real-time technical indicators and price action analysis for {symbol}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <TimeframeSelector timeframe={timeframe} onChange={setTimeframe} />
        </div>
        <div className="flex flex-wrap gap-3 mt-3 lg:mt-4">
          <Badge variant="outline" className="border-gray-700 bg-gray-800/50 text-gray-300 px-3 py-1.5 text-sm lg:text-base">
            <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
            Volatility: {indicators.volatilityLevel}
          </Badge>
          <Badge variant="outline" className="border-gray-700 bg-gray-800/50 text-gray-300 px-3 py-1.5 text-sm lg:text-base">
            <Zap className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
            Trend Strength: {indicators.trendStrength.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative p-4 sm:p-6 lg:p-8 xl:p-10 space-y-6 lg:space-y-8">
        {chartData && (
          <div ref={chartContainerRef} className="bg-gray-800/30 border border-gray-700/50 p-4 sm:p-5 lg:p-6 xl:p-7 rounded-2xl">
            <div className="h-[250px] sm:h-[300px] lg:h-[350px] xl:h-[400px]">
              <Line
                key={chartDimensions.width}
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        color: '#9ca3af',
                        usePointStyle: true,
                        boxWidth: 10,
                        font: { size: chartDimensions.width < 640 ? 11 : 13 }
                      }
                    },
                    tooltip: {
                      backgroundColor: '#1f2937',
                      titleColor: '#f9fafb',
                      bodyColor: '#d1d5db',
                      borderColor: '#374151',
                      borderWidth: 1,
                      padding: chartDimensions.width < 640 ? 8 : 12,
                      bodyFont: { size: chartDimensions.width < 640 ? 12 : 14 },
                      titleFont: { size: chartDimensions.width < 640 ? 13 : 15 }
                    }
                  },
                  scales: {
                    y: {
                      grid: { color: 'rgba(75, 85, 99, 0.2)' },
                      ticks: {
                        color: '#9ca3af',
                        font: { size: chartDimensions.width < 640 ? 10 : 12 },
                        callback: (value) => `$${value.toFixed(2)}`
                      }
                    },
                    x: {
                      grid: { display: false },
                      ticks: {
                        color: '#9ca3af',
                        font: { size: chartDimensions.width < 640 ? 10 : 12 },
                        maxRotation: 45,
                        minRotation: 45
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 xl:gap-8">
          <TrendIndicator
            isUptrend={indicators.isUptrend}
            sma50={tech.sma_50}
            sma200={tech.sma_200}
            strength={indicators.trendStrength}
          />
          <MomentumIndicator
            rsi={tech.rsi}
            isOversold={indicators.isOversold}
            isOverbought={indicators.isOverbought}
          />
        </div>

        <KeyLevels
          current={tech.current_price}
          support={tech.support}
          resistance={tech.resistance}
          distances={{
            support: indicators.distanceToSupport,
            resistance: indicators.distanceToResistance
          }}
        />

        <PivotPoints
          pivot={tech.pivot}
          support={tech.support}
          resistance={tech.resistance}
          current={tech.current_price}
          distance={indicators.distanceToPivot}
        />
      </CardContent>
    </Card>
  );
};

TechnicalIndicatorsCard.propTypes = {
  symbol: PropTypes.string.isRequired,
  className: PropTypes.string,
  onError: PropTypes.func
};

export default TechnicalIndicatorsCard;