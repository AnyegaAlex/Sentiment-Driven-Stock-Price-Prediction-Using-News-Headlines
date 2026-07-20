// components/cards/TechnicalIndicatorsCard.jsx
/**
 * TechnicalIndicatorsCard
 *
 * Displays comprehensive technical analysis including price charts, trend indicators,
 * momentum metrics, support/resistance levels, and pivot points.
 *
 * Gracefully handles missing data:
 * - Empty price_history → shows "No price history available"
 * - Zero SMA/RSI/Support/Resistance/Pivot → shows "N/A" or "—"
 * - No pivot data → shows "Pivot data unavailable"
 *
 * @component
 * @param {Object} props
 * @param {string} props.symbol - Stock ticker symbol
 * @param {string} [props.className] - Additional CSS classes
 * @param {function} [props.onError] - Error callback handler
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTechnicalIndicatorsQuery } from '@/hooks/queries/useTechnicalIndicatorsQuery';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUp,
  ArrowDown,
  Gauge,
  CandlestickChart,
  TrendingUp,
  TrendingDown,
  Info,
  BarChart3,
  Layers,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COLOR_SCHEMES,
  getRSIStatus,
  getChartOptions,
  CardWrapper,
  CardSkeleton,
  CardError,
} from './shared/utils.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Legend, Filler, ChartTooltip);

const TIMEFRAME_OPTIONS = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
];

// ============================================================================
// Sub-Components
// ============================================================================

const TimeframeSelector = ({ timeframe, onChange }) => (
  <div
    className="flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800/50"
    role="radiogroup"
    aria-label="Select timeframe"
  >
    {TIMEFRAME_OPTIONS.map((option) => (
      <Button
        key={option.value}
        variant="ghost"
        size="sm"
        onClick={() => onChange(option.value)}
        aria-pressed={timeframe === option.value}
        className={cn(
          'min-h-[36px] flex-shrink-0 px-3 py-2 text-xs font-medium transition-all sm:min-h-[44px] sm:px-4 sm:text-sm',
          'hover:bg-gray-200 dark:hover:bg-gray-700',
          timeframe === option.value
            ? 'bg-gray-200 text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
            : 'text-gray-500 dark:text-gray-400'
        )}
      >
        {option.label}
      </Button>
    ))}
  </div>
);

TimeframeSelector.propTypes = {
  timeframe: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

// ----------------------------------------------------------------------------
// TrendIndicator – shows N/A when SMAs are zero
// ----------------------------------------------------------------------------
const TrendIndicator = ({ isUptrend, sma50, sma200, strength }) => {
  const hasData = sma50 !== 0 || sma200 !== 0;
  const config = isUptrend ? COLOR_SCHEMES.positive : COLOR_SCHEMES.negative;
  const Icon = isUptrend ? TrendingUp : TrendingDown;

  return (
    <div className={cn('rounded-xl border p-4 sm:p-5', config.bg, config.border)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CandlestickChart className={cn('h-5 w-5', config.text)} aria-hidden="true" />
          <span className="text-base font-medium text-gray-600 dark:text-gray-400">Trend</span>
        </div>
        <Badge className={cn('px-3 py-1.5 text-sm font-medium', config.badge)}>
          {hasData ? (
            <>
              <Icon className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {isUptrend ? 'Uptrend' : 'Downtrend'}
            </>
          ) : (
            'N/A'
          )}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">SMA 50</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-50 font-mono">
            {sma50 !== 0 ? `$${sma50.toFixed(2)}` : '—'}
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">SMA 200</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-50 font-mono">
            {sma200 !== 0 ? `$${sma200.toFixed(2)}` : '—'}
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700/50">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Trend Strength</span>
          <span className={config.text}>
            {hasData ? `${strength.toFixed(1)}%` : 'N/A'}
          </span>
        </div>
        {hasData ? (
          <div
            className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
            role="progressbar"
            aria-valuenow={Math.min(strength, 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn('h-full rounded-full transition-all', config.bg.replace('/30', '/50'))}
              style={{ width: `${Math.min(strength, 100)}%` }}
            />
          </div>
        ) : (
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
        )}
      </div>
    </div>
  );
};

TrendIndicator.propTypes = {
  isUptrend: PropTypes.bool.isRequired,
  sma50: PropTypes.number.isRequired,
  sma200: PropTypes.number.isRequired,
  strength: PropTypes.number.isRequired,
};

// ----------------------------------------------------------------------------
// MomentumIndicator – unchanged (RSI=0 is handled inside the component)
// ----------------------------------------------------------------------------
const MomentumIndicator = ({ rsi, isOversold, isOverbought }) => {
  const config = isOversold ? COLOR_SCHEMES.positive : isOverbought ? COLOR_SCHEMES.negative : COLOR_SCHEMES.neutral;
  const status = isOversold ? 'Oversold' : isOverbought ? 'Overbought' : 'Neutral';

  return (
    <div className={cn('rounded-xl border p-4 sm:p-5', config.bg, config.border)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gauge className={cn('h-5 w-5', config.text)} aria-hidden="true" />
          <span className="text-base font-medium text-gray-600 dark:text-gray-400">Momentum</span>
        </div>
        <Badge className={cn('px-3 py-1.5 text-sm font-medium', config.badge)}>{status}</Badge>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">RSI (14)</span>
          <span className={cn('text-xl font-bold font-mono', config.text)}>{rsi.toFixed(1)}</span>
        </div>
        <div
          className="relative h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
          role="progressbar"
          aria-valuenow={Math.min(rsi, 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn('absolute left-0 top-0 h-full rounded-full transition-all', config.bg.replace('/30', '/50'))}
            style={{ width: `${Math.min(rsi, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
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
  isOverbought: PropTypes.bool.isRequired,
};

// ----------------------------------------------------------------------------
// LevelCard – shows "—" and "N/A" for zero values
// ----------------------------------------------------------------------------
const LevelCard = ({ label, value, type, distance }) => {
  const config = {
    current: { icon: BarChart3, color: COLOR_SCHEMES.neutral },
    support: { icon: ArrowUp, color: COLOR_SCHEMES.positive },
    resistance: { icon: ArrowDown, color: COLOR_SCHEMES.negative },
  }[type];

  const Icon = config.icon;
  const isAbove = distance > 0;
  const isZero = value === 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 dark:border-gray-700/50 dark:bg-gray-800/50">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', config.color.text)} aria-hidden="true" />
          <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        </div>
        {type !== 'current' && !isZero && (
          <Badge className={cn('text-xs font-medium', isAbove ? COLOR_SCHEMES.positive.badge : COLOR_SCHEMES.negative.badge)}>
            {isAbove ? '+' : ''}{distance.toFixed(1)}%
          </Badge>
        )}
        {type !== 'current' && isZero && (
          <Badge variant="outline" className="text-xs text-gray-400">N/A</Badge>
        )}
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl font-mono">
        {isZero ? '—' : `$${value.toFixed(2)}`}
      </div>
    </div>
  );
};

LevelCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  type: PropTypes.oneOf(['current', 'support', 'resistance']).isRequired,
  distance: PropTypes.number.isRequired,
};

// ----------------------------------------------------------------------------
// KeyLevels – collapsible section
// ----------------------------------------------------------------------------
const KeyLevels = ({ current, support, resistance, distances, isOpen, onToggle }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700/50 dark:bg-gray-800/30">
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800/50 sm:p-5"
      aria-expanded={isOpen}
      aria-controls="key-levels-content"
    >
      <h3 className="flex items-center gap-2 text-base font-semibold text-gray-700 dark:text-gray-300">
        <Layers className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
        Key Support & Resistance
      </h3>
      {isOpen ? (
        <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      ) : (
        <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      )}
    </button>
    {isOpen && (
      <div id="key-levels-content" className="p-4 pt-0 sm:p-5 sm:pt-0">
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <LevelCard label="Current Price" value={current} type="current" distance={0} />
          <LevelCard label="Support" value={support} type="support" distance={distances.support} />
          <LevelCard label="Resistance" value={resistance} type="resistance" distance={distances.resistance} />
        </div>
      </div>
    )}
  </div>
);

KeyLevels.propTypes = {
  current: PropTypes.number.isRequired,
  support: PropTypes.number.isRequired,
  resistance: PropTypes.number.isRequired,
  distances: PropTypes.shape({
    support: PropTypes.number.isRequired,
    resistance: PropTypes.number.isRequired,
  }).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

// ----------------------------------------------------------------------------
// PivotPoint – single pivot level (used inside PivotPoints)
// ----------------------------------------------------------------------------
const PivotPoint = ({ label, value, current, type, className }) => {
  const config = {
    resistance: COLOR_SCHEMES.negative,
    support: COLOR_SCHEMES.positive,
    pivot: COLOR_SCHEMES.neutral,
  }[type];

  const isZero = value === 0;
  const distance = isZero ? 0 : ((current - value) / value) * 100;
  const isAbove = distance > 0;

  return (
    <div className={cn('rounded-lg border p-3 sm:p-4', config.bg, config.border, className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 sm:text-sm">{label}</span>
        {!isZero && (
          <Badge className={cn('px-2 py-1 text-xs font-medium', isAbove ? COLOR_SCHEMES.positive.badge : COLOR_SCHEMES.negative.badge)}>
            {isAbove ? 'Above' : 'Below'}
          </Badge>
        )}
        {isZero && <Badge variant="outline" className="text-xs text-gray-400">N/A</Badge>}
      </div>
      <div className="text-base font-bold text-gray-900 dark:text-gray-50 sm:text-lg font-mono">
        {isZero ? '—' : `$${value.toFixed(2)}`}
      </div>
      {!isZero && (
        <div className={cn('mt-2 text-xs', config.text)}>
          {distance >= 0 ? '+' : ''}{distance.toFixed(1)}%
        </div>
      )}
    </div>
  );
};

PivotPoint.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  type: PropTypes.oneOf(['support', 'resistance', 'pivot']).isRequired,
  className: PropTypes.string,
};

// ----------------------------------------------------------------------------
// PivotPoints – collapsible section, shows "Pivot data unavailable" if all zero
// ----------------------------------------------------------------------------
const PivotPoints = ({ pivot, support, resistance, current, distance, isOpen, onToggle }) => {
  const hasData = pivot !== 0 || support !== 0 || resistance !== 0;
  const range = resistance - support;
  const safeRange = range || 1;
  const levels = [
    { label: 'R2', value: pivot + safeRange, type: 'resistance' },
    { label: 'R1', value: pivot + safeRange * 0.5, type: 'resistance' },
    { label: 'Pivot', value: pivot, type: 'pivot' },
    { label: 'S1', value: pivot - safeRange * 0.5, type: 'support' },
    { label: 'S2', value: pivot - safeRange, type: 'support' },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700/50 dark:bg-gray-800/30">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800/50 sm:p-5"
        aria-expanded={isOpen}
        aria-controls="pivot-points-content"
      >
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-700 dark:text-gray-300">
          <Zap className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          Pivot Points
        </h3>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div id="pivot-points-content" className="p-4 pt-0 sm:p-5 sm:pt-0">
          {hasData ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {levels.map((level) => (
                  <PivotPoint
                    key={level.label}
                    label={level.label}
                    value={level.value}
                    current={current}
                    type={level.type}
                  />
                ))}
              </div>
              <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700/50">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Current Position</span>
                  <Badge className={cn('px-3 py-1.5 text-xs font-medium sm:text-sm', distance >= 0 ? COLOR_SCHEMES.positive.badge : COLOR_SCHEMES.negative.badge)}>
                    {distance >= 0 ? '+' : ''}{distance.toFixed(1)}% from pivot
                  </Badge>
                </div>
              </div>
            </>
          ) : (
            <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Pivot data unavailable
            </div>
          )}
        </div>
      )}
    </div>
  );
};

PivotPoints.propTypes = {
  pivot: PropTypes.number.isRequired,
  support: PropTypes.number.isRequired,
  resistance: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  distance: PropTypes.number.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

// ============================================================================
// Main Component
// ============================================================================

const TechnicalIndicatorsCard = ({ symbol, className, onError }) => {
  const [timeframe, setTimeframe] = useState('1d');
  const [isKeyLevelsOpen, setIsKeyLevelsOpen] = useState(true);
  const [isPivotPointsOpen, setIsPivotPointsOpen] = useState(true);
  const chartContainerRef = useRef(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });

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

  const { data, isLoading, error, refetch } = useTechnicalIndicatorsQuery(symbol, timeframe);

  // --------------------------------------------------------------------------
  // Derive indicators, with safety checks for zero data
  // --------------------------------------------------------------------------
  const indicators = useMemo(() => {
    if (!data?.technical) return null;
    const tech = data.technical;

    const hasSmaData = tech.sma_50 !== 0 || tech.sma_200 !== 0;
    const safeSma200 = tech.sma_200 || 1;

    return {
      isUptrend: hasSmaData ? tech.sma_50 > safeSma200 : false,
      isOversold: tech.rsi < 30,
      isOverbought: tech.rsi > 70,
      distanceToSupport: tech.support ? ((tech.current_price - tech.support) / tech.support) * 100 : 0,
      distanceToResistance: tech.current_price ? ((tech.resistance - tech.current_price) / tech.current_price) * 100 : 0,
      distanceToPivot: tech.pivot ? ((tech.current_price - tech.pivot) / tech.pivot) * 100 : 0,
      trendStrength: hasSmaData ? Math.abs(tech.sma_50 - safeSma200) / safeSma200 * 100 : 0,
      volatilityLevel: tech.volatility > 0.2 ? 'high' : tech.volatility > 0.1 ? 'medium' : 'low',
    };
  }, [data]);

  // --------------------------------------------------------------------------
  // Chart data – returns null if price_history is empty
  // --------------------------------------------------------------------------
  const chartData = useMemo(() => {
    if (!data?.technical?.price_history || data.technical.price_history.length === 0) return null;
    const history = data.technical.price_history;
    const isMobile = chartDimensions.width < 640;

    return {
      labels: history.map((_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (history.length - 1 - index));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Price',
          data: history,
          borderColor: COLOR_SCHEMES.neutral.chart,
          backgroundColor: COLOR_SCHEMES.neutral.chartBg,
          tension: 0.1,
          pointRadius: isMobile ? 1 : 2,
          pointHoverRadius: 4,
          fill: true,
        },
        {
          label: 'SMA 50',
          data: history.map(() => data.technical.sma_50),
          borderColor: COLOR_SCHEMES.warning.chart,
          borderDash: [5, 5],
          tension: 0,
          pointRadius: 0,
        },
        {
          label: 'SMA 200',
          data: history.map(() => data.technical.sma_200),
          borderColor: COLOR_SCHEMES.negative.chart,
          borderDash: [5, 5],
          tension: 0,
          pointRadius: 0,
        },
      ],
    };
  }, [data, chartDimensions.width]);

  const handleError = useCallback(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  useEffect(handleError, [handleError]);

  // ==========================================================================
  // Loading State
  // ==========================================================================
  if (isLoading) {
    return (
      <CardSkeleton className={className}>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-8 w-48 bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-11 w-40 bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="mt-3 flex gap-3">
            <Skeleton className="h-6 w-28 bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-6 w-32 bg-gray-200 dark:bg-gray-800" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-4">
          <Skeleton className="h-[200px] rounded-2xl bg-gray-200 dark:bg-gray-800 sm:h-[250px] lg:h-[300px]" />
          <Skeleton className="h-48 rounded-xl bg-gray-200 dark:bg-gray-800" />
          <Skeleton className="h-48 rounded-xl bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-48 rounded-xl bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-64 rounded-xl bg-gray-200 dark:bg-gray-800" />
          </div>
        </CardContent>
      </CardSkeleton>
    );
  }

  // ==========================================================================
  // Error State
  // ==========================================================================
  if (error) {
    return <CardError error={error} onRetry={refetch} className={className} title="Technical Analysis Error" />;
  }

  // ==========================================================================
  // No Data State
  // ==========================================================================
  if (!data || !indicators) {
    return (
      <CardWrapper className={className}>
        <CardHeader>
          <CardTitle>Technical Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No technical data available for {symbol}
          </div>
        </CardContent>
      </CardWrapper>
    );
  }

  const tech = data.technical;
  const rsiStatus = getRSIStatus(tech.rsi);

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <CardWrapper className={className}>
      <CardHeader className="relative pb-3 sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl lg:text-2xl">
              Technical Analysis
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="More information about technical indicators"
                >
                  <Info className="h-5 w-5" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[350px] border-gray-800 bg-gray-900 text-gray-100">
                <p className="text-sm">Real-time technical indicators and price action analysis for {symbol}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <TimeframeSelector timeframe={timeframe} onChange={setTimeframe} />
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
            <TrendingUp className="mr-2 h-4 w-4" aria-hidden="true" />
            Volatility: {indicators.volatilityLevel}
          </Badge>
          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
            <Zap className="mr-2 h-4 w-4" aria-hidden="true" />
            Trend Strength: {indicators.trendStrength > 0 ? `${indicators.trendStrength.toFixed(1)}%` : 'N/A'}
          </Badge>
          <Badge variant="outline" className={cn('border', rsiStatus.color.border)}>
            RSI: {tech.rsi > 0 ? `${tech.rsi.toFixed(1)} (${rsiStatus.label})` : 'N/A'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4 p-4 sm:space-y-6 sm:p-4">
        {chartData ? (
          <div ref={chartContainerRef} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700/50 dark:bg-gray-800/30 sm:rounded-2xl sm:p-4">
            <div className="h-[200px] sm:h-[250px] lg:h-[300px]">
              <Line key={chartDimensions.width} data={chartData} options={getChartOptions(chartDimensions.width)} />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700/50 dark:bg-gray-800/30 dark:text-gray-400">
            No price history available for {symbol}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:gap-4">
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
          distances={{ support: indicators.distanceToSupport, resistance: indicators.distanceToResistance }}
          isOpen={isKeyLevelsOpen}
          onToggle={() => setIsKeyLevelsOpen((prev) => !prev)}
        />

        <PivotPoints
          pivot={tech.pivot}
          support={tech.support}
          resistance={tech.resistance}
          current={tech.current_price}
          distance={indicators.distanceToPivot}
          isOpen={isPivotPointsOpen}
          onToggle={() => setIsPivotPointsOpen((prev) => !prev)}
        />
      </CardContent>
    </CardWrapper>
  );
};

TechnicalIndicatorsCard.displayName = 'TechnicalIndicatorsCard';

TechnicalIndicatorsCard.propTypes = {
  symbol: PropTypes.string.isRequired,
  className: PropTypes.string,
  onError: PropTypes.func,
};

export default TechnicalIndicatorsCard;