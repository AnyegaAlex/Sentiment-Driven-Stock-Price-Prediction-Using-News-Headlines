// components/cards/StockOpinionCard.jsx
/**
 * StockOpinionCard
 *
 * Displays comprehensive stock analysis including recommendation, price metrics,
 * technical indicators, sentiment analysis, price targets, LSTM prediction,
 * and a preview of recent predictions.
 *
 * All components gracefully handle missing data (zero values, empty arrays)
 * by displaying "N/A", "—", or a helpful message.
 *
 * @component
 * @param {Object} props
 * @param {string} props.symbol - Stock ticker symbol
 * @param {'low' | 'medium' | 'high'} [props.riskType='medium'] - Risk tolerance
 * @param {'short-term' | 'medium-term' | 'long-term'} [props.holdTime='medium-term'] - Investment horizon
 * @param {string} [props.className] - Additional CSS classes
 * @param {function} [props.onError] - Error callback handler
 * @param {function} [props.onDataLoaded] - Data loaded callback handler
 */

import React, { useMemo, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useStockOpinionQuery } from '@/hooks/queries/useStockOpinionQuery';
import { usePredictionHistoryQuery } from '@/hooks/queries/usePredictionHistoryQuery';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Info,
  Clock,
  Target,
  Shield,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Activity,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COLOR_SCHEMES,
  formatVolume,
  formatDate,
  formatPercentage,
  getRSIStatus,
  CardWrapper,
  CardSkeleton,
  CardError,
} from './shared/utils.jsx';

// ============================================================================
// Constants
// ============================================================================

const RECOMMENDATION_CONFIG = {
  BUY: { color: COLOR_SCHEMES.positive, icon: TrendingUp, label: 'Buy' },
  STRONG_BUY: { color: COLOR_SCHEMES.positive, icon: TrendingUp, label: 'Strong Buy' },
  SELL: { color: COLOR_SCHEMES.negative, icon: TrendingDown, label: 'Sell' },
  STRONG_SELL: { color: COLOR_SCHEMES.negative, icon: TrendingDown, label: 'Strong Sell' },
  HOLD: { color: COLOR_SCHEMES.neutral, icon: Minus, label: 'Hold' },
  NEUTRAL: { color: COLOR_SCHEMES.neutral, icon: Minus, label: 'Neutral' },
};

const RECOMMENDATION_DISPLAY = {
  BUY: 'BUY',
  STRONG_BUY: 'STRONG BUY',
  SELL: 'SELL',
  STRONG_SELL: 'STRONG SELL',
  HOLD: 'HOLD',
  NEUTRAL: 'NEUTRAL',
};

// ============================================================================
// Sub-Components (with missing‑data fallbacks)
// ============================================================================

const Section = ({ title, icon: Icon, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide uppercase">
        {title}
      </h3>
    </div>
    <div className="pl-1">{children}</div>
  </div>
);

Section.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  children: PropTypes.node.isRequired,
};

// ✅ Displays "N/A" for zero SMAs
const PriceOverviewCard = ({ currentPrice, sma50, sma200 }) => {
  const sma50Diff = sma50 ? ((currentPrice - sma50) / sma50) * 100 : 0;
  const sma200Diff = sma200 ? ((currentPrice - sma200) / sma200) * 100 : 0;

  const formatSMA = (value) => (value === 0 ? 'N/A' : `$${value.toFixed(2)}`);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 dark:border-gray-700/50 dark:bg-gray-800/30">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Current Price</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="More information about current price"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-gray-900 text-gray-100 border-gray-800">
            <p className="text-sm">Last traded price</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-50 sm:text-3xl font-mono">
        ${currentPrice.toFixed(2)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">SMA 50</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-mono text-gray-700 dark:text-gray-300">
              {formatSMA(sma50)}
            </span>
            {sma50 !== 0 && (
              <Badge className={cn('text-xs font-medium', sma50Diff >= 0 ? COLOR_SCHEMES.positive.badge : COLOR_SCHEMES.negative.badge)}>
                {formatPercentage(sma50Diff)}
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">SMA 200</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-mono text-gray-700 dark:text-gray-300">
              {formatSMA(sma200)}
            </span>
            {sma200 !== 0 && (
              <Badge className={cn('text-xs font-medium', sma200Diff >= 0 ? COLOR_SCHEMES.positive.badge : COLOR_SCHEMES.negative.badge)}>
                {formatPercentage(sma200Diff)}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

PriceOverviewCard.propTypes = {
  currentPrice: PropTypes.number.isRequired,
  sma50: PropTypes.number.isRequired,
  sma200: PropTypes.number.isRequired,
};

const SentimentCard = ({ percentage, direction }) => {
  const config = {
    up: { icon: TrendingUp, color: COLOR_SCHEMES.positive, label: 'Bullish' },
    down: { icon: TrendingDown, color: COLOR_SCHEMES.negative, label: 'Bearish' },
    neutral: { icon: Minus, color: COLOR_SCHEMES.neutral, label: 'Neutral' },
  }[direction] || { icon: Minus, color: COLOR_SCHEMES.neutral, label: 'Neutral' };

  const Icon = config.icon;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 dark:border-gray-700/50 dark:bg-gray-800/30">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Market Sentiment</span>
        <Badge className={cn('border font-medium', config.color.badge)}>
          <Icon className="mr-1 h-3 w-3" aria-hidden="true" />
          {config.label}
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Sentiment Score</span>
          <span className={cn('font-medium', config.color.text)}>{percentage.toFixed(0)}%</span>
        </div>
        <Progress
          value={percentage}
          className="h-2 bg-gray-200 dark:bg-gray-700"
          indicatorClassName={cn('bg-gradient-to-r', config.color.gradient)}
        />
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>Bearish</span>
          <span>Neutral</span>
          <span>Bullish</span>
        </div>
      </div>
    </div>
  );
};

SentimentCard.propTypes = {
  percentage: PropTypes.number.isRequired,
  direction: PropTypes.oneOf(['up', 'down', 'neutral']).isRequired,
};

// ✅ Displays "—" when RSI is zero
const RSIIndicator = ({ value }) => {
  if (value === 0) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700/30 dark:bg-gray-800/20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">RSI (14)</span>
          <Badge variant="outline" className="text-xs text-gray-400">N/A</Badge>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-400 dark:text-gray-500 font-mono">—</div>
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">Data unavailable</div>
      </div>
    );
  }

  const status = getRSIStatus(value);
  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700/30 dark:bg-gray-800/20">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">RSI (14)</span>
        <Badge className={cn('text-xs font-medium', status.color.badge)}>{status.label}</Badge>
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50 font-mono">
        {value.toFixed(1)}
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn('h-full rounded-full', status.color.bg.replace('/30', '/50'))}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
};

RSIIndicator.propTypes = { value: PropTypes.number.isRequired };

// ✅ Displays "N/A" when support/resistance is zero
const SupportResistanceIndicator = ({ type, value, current }) => {
  if (value === 0) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700/30 dark:bg-gray-800/20">
        <div className="flex items-center justify-between">
          <span className="text-xs capitalize text-gray-500 dark:text-gray-400">{type}</span>
          <Badge variant="outline" className="text-xs text-gray-400">N/A</Badge>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-400 dark:text-gray-500 font-mono">—</div>
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">Data unavailable</div>
      </div>
    );
  }

  const isSupport = type === 'support';
  const distance = ((current - value) / value) * 100;
  const isAbove = current >= value;
  const status = isSupport
    ? isAbove ? 'Above Support' : 'Below Support'
    : isAbove ? 'Above Resistance' : 'Below Resistance';
  const color = isSupport
    ? isAbove ? COLOR_SCHEMES.positive : COLOR_SCHEMES.negative
    : isAbove ? COLOR_SCHEMES.positive : COLOR_SCHEMES.neutral;

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700/30 dark:bg-gray-800/20">
      <div className="flex items-center justify-between">
        <span className="text-xs capitalize text-gray-500 dark:text-gray-400">{type}</span>
        <Badge className={cn('text-xs font-medium', color.badge)}>
          {formatPercentage(distance)}
        </Badge>
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50 font-mono">
        ${value.toFixed(2)}
      </div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{status}</div>
    </div>
  );
};

SupportResistanceIndicator.propTypes = {
  type: PropTypes.oneOf(['support', 'resistance']).isRequired,
  value: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
};

// ✅ Displays "—" when volume is zero
const VolumeIndicator = ({ volume }) => (
  <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700/30 dark:bg-gray-800/20">
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500 dark:text-gray-400">Volume</span>
      <Activity className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
    </div>
    <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50 font-mono">
      {volume > 0 ? formatVolume(volume) : '—'}
    </div>
    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
      {volume > 0 ? '24h trading volume' : 'Data unavailable'}
    </div>
  </div>
);

VolumeIndicator.propTypes = { volume: PropTypes.number.isRequired };

const TargetCard = ({ label, value, current, type }) => {
  const safeCurrent = current || 1;
  const diff = ((value - safeCurrent) / safeCurrent) * 100;
  const config = {
    bullish: { color: COLOR_SCHEMES.positive, icon: TrendingUp },
    bearish: { color: COLOR_SCHEMES.negative, icon: TrendingDown },
    base: { color: COLOR_SCHEMES.neutral, icon: Minus },
  }[type] || { color: COLOR_SCHEMES.neutral, icon: Minus };

  const Icon = config.icon;

  return (
    <div className={cn('rounded-lg border p-3 sm:p-4', config.color.border, config.color.bg)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <Icon className={cn('h-4 w-4', config.color.text)} aria-hidden="true" />
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl font-mono">
        ${value.toFixed(2)}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge className={cn('text-xs font-medium', config.color.badge)}>
          {formatPercentage(diff)}
        </Badge>
        <span className="text-xs text-gray-500 dark:text-gray-400">from current</span>
      </div>
    </div>
  );
};

TargetCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  type: PropTypes.oneOf(['bullish', 'bearish', 'base']).isRequired,
};

const FactorItem = ({ title, description, impact }) => {
  const config = {
    positive: { color: COLOR_SCHEMES.positive, icon: TrendingUp },
    negative: { color: COLOR_SCHEMES.negative, icon: TrendingDown },
    neutral: { color: COLOR_SCHEMES.neutral, icon: Minus },
  }[impact || 'neutral'];

  const Icon = config.icon;

  return (
    <div className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700/30 dark:bg-gray-800/20">
      <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg', config.color.bg)}>
        <Icon className={cn('h-3.5 w-3.5', config.color.text)} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">{title}</h4>
        <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
};

FactorItem.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  impact: PropTypes.oneOf(['positive', 'negative', 'neutral']),
};

const RecommendationBadge = ({ recommendation }) => {
  const normalizedRec = recommendation?.toUpperCase() || 'HOLD';
  const config = RECOMMENDATION_CONFIG[normalizedRec] || RECOMMENDATION_CONFIG.HOLD;
  const Icon = config.icon;
  const displayLabel = RECOMMENDATION_DISPLAY[normalizedRec] || normalizedRec;

  return (
    <Badge className={cn('flex h-9 items-center border px-3 py-1.5 text-sm font-semibold', config.color.badge)}>
      <Icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
      {displayLabel}
    </Badge>
  );
};

RecommendationBadge.propTypes = {
  recommendation: PropTypes.oneOf([
    'BUY', 'STRONG_BUY', 'SELL', 'STRONG_SELL', 'HOLD', 'NEUTRAL'
  ]),
};

const ConfidenceBadge = ({ confidence }) => (
  <Badge variant="outline" className="flex h-9 items-center border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800/50">
    <span className="text-sm text-gray-600 dark:text-gray-300">Confidence</span>
    <span className="ml-2 text-sm font-bold text-gray-900 dark:text-gray-50">
      {Math.round((confidence || 0) * 100)}%
    </span>
  </Badge>
);

ConfidenceBadge.propTypes = { confidence: PropTypes.number };

const LSTMPredictionBadge = ({ prediction }) => {
  if (!prediction || prediction.direction === 'UNAVAILABLE') {
    return (
      <Badge variant="outline" className="flex h-9 items-center border-gray-400 bg-gray-100 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400">
        <Zap className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        LSTM: Unavailable
      </Badge>
    );
  }

  const isUp = prediction.direction === 'UP';
  const color = isUp ? COLOR_SCHEMES.positive : COLOR_SCHEMES.negative;
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <Badge className={cn('flex h-9 items-center border px-3 py-1.5 text-sm font-semibold', color.badge)}>
      <Icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
      LSTM: {prediction.direction}
      <span className="ml-1.5 text-xs font-normal opacity-75">
        {prediction.confidence ? `${prediction.confidence}%` : ''}
      </span>
    </Badge>
  );
};

LSTMPredictionBadge.propTypes = {
  prediction: PropTypes.shape({
    direction: PropTypes.oneOf(['UP', 'DOWN', 'UNAVAILABLE']),
    confidence: PropTypes.number,
  }),
};

// ============================================================================
// Recent Predictions
// ============================================================================

const RecentPredictions = ({ symbol }) => {
  const { data: historyData, isLoading, error } = usePredictionHistoryQuery({ symbol, limit: 3 });

  const history = useMemo(() => {
    if (Array.isArray(historyData)) return historyData;
    if (historyData?.results) return historyData.results;
    return [];
  }, [historyData]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-800" />
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 flex-1 rounded-lg bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !history.length) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {error ? 'Unable to load recent predictions' : 'No recent predictions'}
      </div>
    );
  }

  const predictions = history.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">Recent Predictions</h4>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400"
          onClick={() => (window.location.href = '/prediction-history')}
        >
          View All <ChevronRight className="ml-0.5 h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {predictions.map((pred, idx) => {
          const movement = pred?.predicted_movement || pred?.movement || 'neutral';
          const isUp = movement === 'up' || movement === 'UP';
          const isDown = movement === 'down' || movement === 'DOWN';
          const config = isUp ? COLOR_SCHEMES.positive : isDown ? COLOR_SCHEMES.negative : COLOR_SCHEMES.neutral;
          const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
          const displayMovement = movement.toUpperCase();

          return (
            <div
              key={idx}
              className={cn(
                'flex flex-col items-center rounded-lg border p-2 text-center',
                config.bg,
                config.border
              )}
            >
              <div className="flex items-center gap-1 text-xs font-medium">
                <Icon className={cn('h-3 w-3', config.text)} />
                <span className={config.text}>{displayMovement}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formatDate(pred?.date || pred?.created_at)}
              </div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Conf: {Math.round((pred?.confidence || 0) * 100)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

RecentPredictions.propTypes = {
  symbol: PropTypes.string.isRequired,
};

// ============================================================================
// Main Component
// ============================================================================

const StockOpinionCard = ({
  symbol,
  riskType = 'medium',
  holdTime = 'medium-term',
  className,
  onError,
  onDataLoaded,
}) => {
  const { data: rawData, isLoading, error, refetch } = useStockOpinionQuery(symbol, riskType, holdTime);

  const data = useMemo(() => rawData || null, [rawData]);

  const derived = useMemo(() => {
    if (!data) return null;

    const sentiment = data.sentiment || 0;
    const sentimentPercentage = Math.abs(sentiment * 100);
    const sentimentDirection = sentiment > 0 ? 'up' : sentiment < 0 ? 'down' : 'neutral';
    const currentPrice = data.technicalIndicators?.currentPrice || 0;

    return {
      sentimentPercentage,
      sentimentDirection,
      technicals: {
        currentPrice,
        rsi: data.technicalIndicators?.rsi || 0,
        sma50: data.technicalIndicators?.sma50 || 0,
        sma200: data.technicalIndicators?.sma200 || 0,
        support: data.technicalIndicators?.support || 0,
        resistance: data.technicalIndicators?.resistance || 0,
        volume: data.technicalIndicators?.volume || 0,
      },
      targets: {
        base: data.priceTargets?.base || currentPrice,
        bullish: data.priceTargets?.bullish || currentPrice * 1.15,
        bearish: data.priceTargets?.bearish || currentPrice * 0.85,
      },
      lstmPrediction: data.lstm_prediction || null,
    };
  }, [data]);

  const handleDataLoaded = useCallback(() => {
    if (data && onDataLoaded) onDataLoaded(data);
  }, [data, onDataLoaded]);

  const handleError = useCallback(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  useEffect(handleDataLoaded, [handleDataLoaded]);
  useEffect(handleError, [handleError]);

  if (isLoading) {
    return (
      <CardSkeleton className={className}>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-gray-200 dark:bg-gray-800" />
              <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 bg-gray-200 dark:bg-gray-800" />
              <Skeleton className="h-9 w-28 bg-gray-200 dark:bg-gray-800" />
              <Skeleton className="h-9 w-32 bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-6 w-24 bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-6 w-28 bg-gray-200 dark:bg-gray-800" />
          </div>
        </CardHeader>
        <Separator className="bg-gray-200 dark:bg-gray-800" />
        <CardContent className="space-y-5 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-40 rounded-xl bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-40 rounded-xl bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-40 bg-gray-200 dark:bg-gray-800" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg bg-gray-200 dark:bg-gray-800" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-32 bg-gray-200 dark:bg-gray-800" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-lg bg-gray-200 dark:bg-gray-800" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-800" />
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 flex-1 rounded-lg bg-gray-200 dark:bg-gray-800" />
              ))}
            </div>
          </div>
        </CardContent>
      </CardSkeleton>
    );
  }

  if (error) {
    return <CardError error={error} onRetry={refetch} className={className} title="Analysis Error" />;
  }

  if (!data || !derived) return null;

  const { sentimentPercentage, sentimentDirection, technicals, targets, lstmPrediction } = derived;
  const recommendation = data.recommendation || 'HOLD';

  // Check if key technical data is missing
  const hasTechnicalData = technicals.sma50 > 0 || technicals.sma200 > 0;

  return (
    <CardWrapper className={cn('relative overflow-hidden', className)}>
      <div
        className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-5', RECOMMENDATION_CONFIG[recommendation]?.color?.gradient || '')}
        aria-hidden="true"
      />

      <CardHeader className="relative space-y-3 pb-3 sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-xl lg:text-2xl">
              {data.company || symbol}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              <span className="font-mono text-gray-700 dark:text-gray-300">{data.symbol}</span>
              <span className="hidden h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-600 sm:inline-block" />
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(data.lastUpdated)}
              </span>
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!hasTechnicalData && (
              <Badge variant="destructive" className="text-xs">
                Technical data unavailable
              </Badge>
            )}
            <RecommendationBadge recommendation={recommendation} />
            <ConfidenceBadge confidence={data.confidence} />
            <LSTMPredictionBadge prediction={lstmPrediction} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
            Risk: {riskType.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
            Horizon: {holdTime.replace('-', ' ')}
          </Badge>
        </div>
      </CardHeader>

      <Separator className="bg-gray-200 dark:bg-gray-800" />

      <CardContent className="relative space-y-4 p-4 sm:space-y-5 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
          <PriceOverviewCard
            currentPrice={technicals.currentPrice}
            sma50={technicals.sma50}
            sma200={technicals.sma200}
          />
          <SentimentCard percentage={sentimentPercentage} direction={sentimentDirection} />
        </div>

        <Section title="Technical Analysis" icon={BarChart3}>
          <div className="grid grid-cols-1 gap-3">
            <RSIIndicator value={technicals.rsi} />
            <SupportResistanceIndicator type="support" value={technicals.support} current={technicals.currentPrice} />
            <SupportResistanceIndicator type="resistance" value={technicals.resistance} current={technicals.currentPrice} />
            <VolumeIndicator volume={technicals.volume} />
          </div>
        </Section>

        <Section title="Price Targets" icon={Target}>
          <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-3">
            <TargetCard label="Bearish Case" value={targets.bearish} current={technicals.currentPrice} type="bearish" />
            <TargetCard label="Base Case" value={targets.base} current={technicals.currentPrice} type="base" />
            <TargetCard label="Bullish Case" value={targets.bullish} current={technicals.currentPrice} type="bullish" />
          </div>
        </Section>

        {data.keyFactors?.length > 0 && (
          <Section title="Investment Thesis" icon={Shield}>
            <div className="space-y-2 sm:space-y-3">
              {data.keyFactors.map((factor, index) => (
                <FactorItem key={`${factor.title}-${index}`} title={factor.title} description={factor.description} impact={factor.impact} />
              ))}
            </div>
          </Section>
        )}

        <div className="pt-1">
          <RecentPredictions symbol={symbol} />
        </div>

        <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Analysis generated {formatDate(data.lastUpdated)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="min-h-[44px] border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-50"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} aria-hidden="true" />
            Refresh Analysis
          </Button>
        </div>
      </CardContent>
    </CardWrapper>
  );
};

StockOpinionCard.propTypes = {
  symbol: PropTypes.string.isRequired,
  riskType: PropTypes.oneOf(['low', 'medium', 'high']),
  holdTime: PropTypes.oneOf(['short-term', 'medium-term', 'long-term']),
  className: PropTypes.string,
  onError: PropTypes.func,
  onDataLoaded: PropTypes.func,
};

export default StockOpinionCard;