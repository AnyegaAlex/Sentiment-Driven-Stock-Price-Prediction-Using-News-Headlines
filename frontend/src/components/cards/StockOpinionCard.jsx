import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { useStockOpinionQuery } from "@/hooks/queries/useStockOpinionQuery";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Info,
  AlertCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Activity,
  BarChart3,
  Clock,
  DollarSign,
  Target,
  Shield,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// Color Constants (same as before)
const COLORS = {
  positive: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500 to-green-400",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  },
  negative: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
    gradient: "from-rose-500 to-red-400",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/25",
  },
  neutral: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    gradient: "from-blue-500 to-cyan-400",
    badge: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  },
};

// Sub-components (Section, PriceOverviewCard, SentimentCard, RSIIndicator, SupportResistanceIndicator,
// VolumeIndicator, TargetCard, FactorItem, RecommendationBadge, ConfidenceBadge, LoadingSkeleton, ErrorDisplay, NoDataDisplay)
// These are exactly the same as your original file – we keep them unchanged.
// (I'll include them below for completeness.)

// --- Sub-components (copy from your original file) ---
const Section = ({ title, icon, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-lg bg-gray-800/80 text-gray-400">{icon}</div>
      <h3 className="text-sm font-semibold text-gray-300 tracking-wide uppercase">{title}</h3>
    </div>
    <div className="pl-1">{children}</div>
  </div>
);
Section.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  children: PropTypes.node.isRequired,
};

const PriceOverviewCard = ({ currentPrice, sma50, sma200 }) => {
  const sma50Diff = ((currentPrice - sma50) / sma50) * 100;
  const sma200Diff = ((currentPrice - sma200) / sma200) * 100;
  return (
    <div className="p-5 rounded-xl bg-gray-800/30 border border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-400">Current Price</span>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 text-gray-500" />
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-gray-800 border-gray-700">
            <p className="text-sm text-gray-300">Last traded price</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="text-3xl font-bold text-gray-50 font-mono">${currentPrice.toFixed(2)}</div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="text-xs text-gray-500">SMA 50</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-300">${sma50.toFixed(2)}</span>
            <Badge className={cn("text-xs", sma50Diff >= 0 ? COLORS.positive.badge : COLORS.negative.badge)}>
              {sma50Diff >= 0 ? '+' : ''}{sma50Diff.toFixed(1)}%
            </Badge>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">SMA 200</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-300">${sma200.toFixed(2)}</span>
            <Badge className={cn("text-xs", sma200Diff >= 0 ? COLORS.positive.badge : COLORS.negative.badge)}>
              {sma200Diff >= 0 ? '+' : ''}{sma200Diff.toFixed(1)}%
            </Badge>
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
    up: { icon: TrendingUp, color: COLORS.positive, label: 'Bullish' },
    down: { icon: TrendingDown, color: COLORS.negative, label: 'Bearish' },
    neutral: { icon: Minus, color: COLORS.neutral, label: 'Neutral' },
  }[direction];
  const Icon = config.icon;
  return (
    <div className="p-5 rounded-xl bg-gray-800/30 border border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-400">Market Sentiment</span>
        <Badge className={cn("border", config.color.badge)}>
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Sentiment Score</span>
          <span className={cn("font-medium", config.color.text)}>{percentage.toFixed(0)}%</span>
        </div>
        <Progress value={percentage} className="h-2 bg-gray-700" indicatorClassName={cn("bg-gradient-to-r", config.color.gradient)} />
        <div className="flex justify-between text-xs text-gray-500">
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

const RSIIndicator = ({ value }) => {
  const getRSIStatus = (rsi) => {
    if (rsi >= 70) return { label: 'Overbought', color: COLORS.negative };
    if (rsi <= 30) return { label: 'Oversold', color: COLORS.positive };
    return { label: 'Neutral', color: COLORS.neutral };
  };
  const status = getRSIStatus(value);
  return (
    <div className="p-4 rounded-lg bg-gray-800/20 border border-gray-700/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">RSI (14)</span>
        <Badge className={cn("text-xs", status.color.badge)}>{status.label}</Badge>
      </div>
      <div className="text-xl font-bold font-mono text-gray-50">{value.toFixed(1)}</div>
    </div>
  );
};
RSIIndicator.propTypes = {
  value: PropTypes.number.isRequired,
};

const SupportResistanceIndicator = ({ type, value, current }) => {
  const isSupport = type === 'support';
  const distance = ((current - value) / value) * 100;
  const isAbove = current >= value;
  const status = isSupport
    ? (isAbove ? 'Above Support' : 'Below Support')
    : (isAbove ? 'Above Resistance' : 'Below Resistance');
  const color = isSupport
    ? (isAbove ? COLORS.positive : COLORS.negative)
    : (isAbove ? COLORS.positive : COLORS.neutral);
  return (
    <div className="p-4 rounded-lg bg-gray-800/20 border border-gray-700/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 capitalize">{type}</span>
        <Badge className={cn("text-xs", color.badge)}>
          {distance >= 0 ? '+' : ''}{distance.toFixed(1)}%
        </Badge>
      </div>
      <div className="text-xl font-bold font-mono text-gray-50">${value.toFixed(2)}</div>
      <div className="mt-1 text-xs text-gray-500">{status}</div>
    </div>
  );
};
SupportResistanceIndicator.propTypes = {
  type: PropTypes.oneOf(['support', 'resistance']).isRequired,
  value: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
};

const VolumeIndicator = ({ volume }) => {
  const formatVolume = (vol) => {
    const safe = Number(vol);
    if (!Number.isFinite(safe) || safe <= 0) return "—";
    if (safe >= 1e9) return `${(safe / 1e9).toFixed(1)}B`;
    if (safe >= 1e6) return `${(safe / 1e6).toFixed(1)}M`;
    if (safe >= 1e3) return `${(safe / 1e3).toFixed(1)}K`;
    return String(safe);
  };
  return (
    <div className="p-4 rounded-lg bg-gray-800/20 border border-gray-700/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">Volume</span>
        <Activity className="h-3.5 w-3.5 text-gray-500" />
      </div>
      <div className="text-xl font-bold font-mono text-gray-50">{formatVolume(volume)}</div>
      <div className="mt-1 text-xs text-gray-500">24h trading volume</div>
    </div>
  );
};
VolumeIndicator.propTypes = {
  volume: PropTypes.number.isRequired,
};

const TargetCard = ({ label, value, current, type }) => {
  const diff = ((value - current) / current) * 100;
  const config = {
    bullish: { color: COLORS.positive, icon: TrendingUp },
    bearish: { color: COLORS.negative, icon: TrendingDown },
    base: { color: COLORS.neutral, icon: Minus },
  }[type];
  const Icon = config.icon;
  return (
    <div className={cn("p-4 rounded-lg border", config.color.border, config.color.bg)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">{label}</span>
        <Icon className={cn("h-4 w-4", config.color.text)} />
      </div>
      <div className="text-xl font-bold font-mono text-gray-50">${value.toFixed(2)}</div>
      <div className="mt-2 flex items-center gap-1.5">
        <Badge className={cn("text-xs", config.color.badge)}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}%</Badge>
        <span className="text-xs text-gray-500">from current</span>
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
    positive: { color: COLORS.positive, icon: TrendingUp },
    negative: { color: COLORS.negative, icon: TrendingDown },
    neutral: { color: COLORS.neutral, icon: Minus },
  }[impact || 'neutral'];
  const Icon = config.icon;
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-gray-800/20 border border-gray-700/30">
      <div className={cn("p-1.5 rounded-lg", config.color.bg)}>
        <Icon className={cn("h-3.5 w-3.5", config.color.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-200 mb-1">{title}</h4>
        <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
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
  const config = {
    BUY: { color: COLORS.positive, icon: TrendingUp },
    SELL: { color: COLORS.negative, icon: TrendingDown },
    HOLD: { color: COLORS.neutral, icon: Minus },
  }[recommendation];
  const Icon = config.icon;
  return (
    <Badge className={cn("px-3 py-1.5 text-sm font-semibold border", config.color.badge)}>
      <Icon className="h-3.5 w-3.5 mr-1.5" />
      {recommendation}
    </Badge>
  );
};
RecommendationBadge.propTypes = {
  recommendation: PropTypes.oneOf(['BUY', 'SELL', 'HOLD']).isRequired,
};

const ConfidenceBadge = ({ confidence }) => (
  <Badge variant="outline" className="px-3 py-1.5 border-gray-700 bg-gray-800/50">
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-300">Confidence</span>
      <span className="text-sm font-bold text-gray-50">{Math.round((confidence || 0) * 100)}%</span>
    </div>
  </Badge>
);
ConfidenceBadge.propTypes = {
  confidence: PropTypes.number,
};

const LoadingSkeleton = ({ className }) => (
  <Card className={cn("border-gray-800/50 bg-gray-900/95", className)}>
    <CardHeader className="pb-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-gray-800" />
          <Skeleton className="h-4 w-32 bg-gray-800" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 bg-gray-800" />
          <Skeleton className="h-8 w-24 bg-gray-800" />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Skeleton className="h-6 w-24 bg-gray-800" />
        <Skeleton className="h-6 w-28 bg-gray-800" />
      </div>
    </CardHeader>
    <Separator className="bg-gray-800" />
    <CardContent className="p-5 sm:p-6 space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-36 rounded-xl bg-gray-800" />
        <Skeleton className="h-36 rounded-xl bg-gray-800" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40 bg-gray-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Skeleton className="h-24 rounded-lg bg-gray-800" />
          <Skeleton className="h-24 rounded-lg bg-gray-800" />
          <Skeleton className="h-24 rounded-lg bg-gray-800" />
          <Skeleton className="h-24 rounded-lg bg-gray-800" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-32 bg-gray-800" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-28 rounded-lg bg-gray-800" />
          <Skeleton className="h-28 rounded-lg bg-gray-800" />
          <Skeleton className="h-28 rounded-lg bg-gray-800" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-36 bg-gray-800" />
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-lg bg-gray-800" />
          <Skeleton className="h-16 rounded-lg bg-gray-800" />
        </div>
      </div>
    </CardContent>
  </Card>
);
LoadingSkeleton.propTypes = { className: PropTypes.string };

const ErrorDisplay = ({ error, onRetry }) => (
  <Alert className="border-rose-500/30 bg-rose-500/10">
    <AlertCircle className="h-4 w-4 text-rose-400" />
    <AlertTitle className="text-rose-300 font-semibold">Analysis Error</AlertTitle>
    <AlertDescription className="text-rose-200/80">
      {error.message} {error.status && `(Status: ${error.status})`}
    </AlertDescription>
    <Button variant="outline" size="sm" onClick={onRetry} className="mt-3 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300">
      <RefreshCw className="mr-2 h-4 w-4" /> Retry
    </Button>
  </Alert>
);
ErrorDisplay.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string.isRequired,
    status: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  onRetry: PropTypes.func.isRequired,
};

const NoDataDisplay = ({ symbol }) => (
  <Alert className="border-gray-700 bg-gray-800/50">
    <Info className="h-4 w-4 text-blue-400" />
    <AlertTitle className="text-gray-200">No Data Available</AlertTitle>
    <AlertDescription className="text-gray-400">
      Could not retrieve analysis for {symbol}. Try another stock or check back later.
    </AlertDescription>
  </Alert>
);
NoDataDisplay.propTypes = {
  symbol: PropTypes.string.isRequired,
};

// ============================================================================
// Main Component (React Query version)
// ============================================================================

const StockOpinionCard = ({
  symbol,
  riskType = "medium",
  holdTime = "medium-term",
  className,
  onError,
  onDataLoaded,
}) => {
  // Use the React Query hook
  const { data: rawData, isLoading, error, refetch } = useStockOpinionQuery(symbol, riskType, holdTime);

  // If you have validation, you can do it here, but the query should return already validated data.
  // For safety, we keep a memoized version.
  const data = useMemo(() => {
    if (!rawData) return null;
    // Optionally validate structure here
    return rawData;
  }, [rawData]);

  const derived = useMemo(() => {
    if (!data) return null;
    const sentiment = data.sentiment || 0;
    const sentimentPercentage = Math.abs(sentiment * 100);
    const sentimentDirection = sentiment > 0 ? "up" : sentiment < 0 ? "down" : "neutral";
    return {
      sentimentPercentage,
      sentimentDirection,
      technicals: {
        currentPrice: data.technicalIndicators?.currentPrice || 0,
        rsi: data.technicalIndicators?.rsi || 50,
        sma50: data.technicalIndicators?.sma50 || 0,
        sma200: data.technicalIndicators?.sma200 || 0,
        support: data.technicalIndicators?.support || 0,
        resistance: data.technicalIndicators?.resistance || 0,
        volume: data.technicalIndicators?.volume || 0,
      },
      targets: {
        base: data.priceTargets?.base || data.technicalIndicators?.currentPrice || 0,
        bullish: data.priceTargets?.bullish || (data.technicalIndicators?.currentPrice || 0) * 1.15,
        bearish: data.priceTargets?.bearish || (data.technicalIndicators?.currentPrice || 0) * 0.85,
      },
    };
  }, [data]);

  // If loading, show skeleton
  if (isLoading) return <LoadingSkeleton className={className} />;
  if (error) return <ErrorDisplay error={{ message: error.message }} onRetry={refetch} />;
  if (!data || !derived) return <NoDataDisplay symbol={symbol} />;

  const { sentimentPercentage, sentimentDirection, technicals, targets } = derived;

  // Render the card (same as original, but using the derived data)
  return (
    <Card className={cn(
      "relative overflow-hidden border-gray-800/50 bg-gray-900/95 backdrop-blur-xl",
      "shadow-2xl shadow-black/50",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 via-transparent to-transparent pointer-events-none" />
      <CardHeader className="relative pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-50 tracking-tight">
              {data.company}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-sm text-gray-400">
              <span className="font-mono text-gray-300">{data.symbol}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RecommendationBadge recommendation={data.recommendation} />
            <ConfidenceBadge confidence={data.confidence} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-gray-700 bg-gray-800/50 text-gray-300">
            Risk: {riskType.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="border-gray-700 bg-gray-800/50 text-gray-300">
            Horizon: {holdTime.replace('-', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <Separator className="bg-gray-800" />
      <CardContent className="relative p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PriceOverviewCard
            currentPrice={technicals.currentPrice}
            sma50={technicals.sma50}
            sma200={technicals.sma200}
          />
          <SentimentCard percentage={sentimentPercentage} direction={sentimentDirection} />
        </div>

        <Section title="Technical Analysis" icon={<BarChart3 className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <RSIIndicator value={technicals.rsi} />
            <SupportResistanceIndicator type="support" value={technicals.support} current={technicals.currentPrice} />
            <SupportResistanceIndicator type="resistance" value={technicals.resistance} current={technicals.currentPrice} />
            <VolumeIndicator volume={technicals.volume} />
          </div>
        </Section>

        <Section title="Price Targets" icon={<Target className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TargetCard label="Bearish Case" value={targets.bearish} current={technicals.currentPrice} type="bearish" />
            <TargetCard label="Base Case" value={targets.base} current={technicals.currentPrice} type="base" />
            <TargetCard label="Bullish Case" value={targets.bullish} current={technicals.currentPrice} type="bullish" />
          </div>
        </Section>

        {data.keyFactors?.length > 0 && (
          <Section title="Investment Thesis" icon={<Shield className="h-4 w-4" />}>
            <div className="space-y-3">
              {data.keyFactors.map((factor, idx) => (
                <FactorItem key={idx} title={factor.title} description={factor.description} impact={factor.impact} />
              ))}
            </div>
          </Section>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <p className="text-xs text-gray-500">Analysis generated {new Date(data.lastUpdated).toLocaleString()}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="border-gray-700 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-gray-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
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