import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { 
  Info, 
  ArrowUp, 
  ArrowDown, 
  Gauge, 
  CandlestickChart, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Target,
  Shield,
  BarChart3,
  Newspaper,
  Clock,
  Activity,
  TrendingUp as TrendUp,
  TrendingDown as TrendDown,
  Minus,
  Zap,
  Layers
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fetchMockStockAnalysis } from '@/services/mockStockAnalysis';

// ============================================================================
// Color Constants (unchanged)
// ============================================================================
const COLORS = {
  positive: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    gradient: 'from-emerald-500 to-green-400',
    progress: 'bg-emerald-500'
  },
  negative: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
    gradient: 'from-rose-500 to-red-400',
    progress: 'bg-rose-500'
  },
  neutral: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    gradient: 'from-blue-500 to-cyan-400',
    progress: 'bg-blue-500'
  },
  warning: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/20',
    badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
    progress: 'bg-yellow-500'
  }
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

const StockDashboard = ({ symbol = 'IBM' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('1d');
  const IS_MOCK = process.env.NODE_ENV === 'production';

  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (IS_MOCK) {
        const mockData = await fetchMockStockAnalysis(symbol, 'medium', 'medium-term');
        setStockData(mockData);
        setLastUpdated(new Date());
        return;
      }

      const response = await axios.get(`/api/stock-analysis`, {
        params: {
          symbol,
          risk_type: 'medium',
          hold_time: 'medium-term',
          detail_level: 'comprehensive'
        },
        timeout: 10000
      });

      setStockData(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch stock data');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, IS_MOCK]);

  useEffect(() => {
    fetchStockData();
    const interval = setInterval(fetchStockData, 300000);
    return () => clearInterval(interval);
  }, [fetchStockData]);

  const processedData = useMemo(() => {
    if (!stockData) return null;

    const {
      company = symbol,
      recommendation = 'HOLD',
      confidence = 0.81,
      sentiment = 0,
      technical = {},
      priceTargets = {},
      keyFactors = [],
      riskAssessment = {},
      news_count = 0,
      source_stats = {}
    } = stockData;

    const currentPrice = technical.current_price || 116.16;
    const sma50 = technical.sma_50 || 114.84;
    const sma200 = technical.sma_200 || 111.81;
    const rsi = technical.rsi || 70.8;
    const support = technical.support || 110.35;
    const resistance = technical.resistance || 121.97;
    const pivot = technical.pivot || 116.16;
    const volume = technical.volume || 12424000;

    const sentimentScore = ((sentiment + 1) / 2) * 100;

    return {
      company,
      recommendation,
      confidence,
      sentiment: sentimentScore,
      riskLevel: riskAssessment.level || 'MEDIUM',
      horizon: riskAssessment.horizon || 'medium-term',
      lastUpdated,
      technical: {
        currentPrice,
        sma50,
        sma200,
        rsi,
        support,
        resistance,
        pivot,
        volume,
        sma50Diff: ((currentPrice - sma50) / sma50) * 100,
        sma200Diff: ((currentPrice - sma200) / sma200) * 100,
        supportDiff: ((currentPrice - support) / support) * 100,
        resistanceDiff: ((resistance - currentPrice) / currentPrice) * 100,
        pivotDiff: ((currentPrice - pivot) / pivot) * 100,
        isUptrend: sma50 > sma200,
        rsiStatus: rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral'
      },
      targets: {
        bearish: priceTargets.bearish || currentPrice * 0.9,
        base: priceTargets.base || currentPrice,
        bullish: priceTargets.bullish || currentPrice * 1.14,
        bearishDiff: (( (priceTargets.bearish || currentPrice * 0.9) - currentPrice) / currentPrice) * 100,
        bullishDiff: (( (priceTargets.bullish || currentPrice * 1.14) - currentPrice) / currentPrice) * 100
      },
      factors: keyFactors.slice(0, 3),
      news: {
        count: news_count,
        tier1Sources: source_stats.tier1_count || 0,
        topSource: source_stats.tier1_sources?.[0] || 'Reuters'
      }
    };
  }, [stockData, lastUpdated, symbol]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchStockData} />;
  }

  if (!processedData) return null;

  const data = processedData;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header - Full width with responsive padding */}
      <header className="border-b border-gray-800/50 bg-gray-900/95 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-3 sm:py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-50">
                Stock Sentiment Dashboard
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2">
                <Badge variant="outline" className="border-gray-700 bg-gray-800/50 text-gray-300 px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm">
                  Risk: {data.riskLevel}
                </Badge>
                <Badge variant="outline" className="border-gray-700 bg-gray-800/50 text-gray-300 px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm">
                  Horizon: {data.horizon}
                </Badge>
                <Badge variant="outline" className="border-gray-700 bg-gray-800/50 text-gray-300 px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm">
                  View: Summary
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button variant="outline" size="sm" className="border-gray-700 bg-gray-800/50 min-h-[44px] text-sm">
                <Newspaper className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">News</span>
                <span className="xs:hidden">News</span>
              </Button>
              <Button variant="outline" size="sm" className="border-gray-700 bg-gray-800/50 min-h-[44px] text-sm">
                <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">History</span>
                <span className="xs:hidden">History</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Stock Overview Card - Full width */}
        <StockOverviewCard data={data} />

        {/* Tabs - Responsive scroll */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto pb-1 sm:pb-0">
            <TabsList className="bg-gray-900/95 border border-gray-800 p-1 w-full sm:w-auto min-w-[400px] sm:min-w-0">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gray-800 px-3 sm:px-6 py-2 text-sm sm:text-base min-h-[44px]">Overview</TabsTrigger>
              <TabsTrigger value="technical" className="data-[state=active]:bg-gray-800 px-3 sm:px-6 py-2 text-sm sm:text-base min-h-[44px]">Technical</TabsTrigger>
              <TabsTrigger value="sentiment" className="data-[state=active]:bg-gray-800 px-3 sm:px-6 py-2 text-sm sm:text-base min-h-[44px]">Sentiment</TabsTrigger>
              <TabsTrigger value="thesis" className="data-[state=active]:bg-gray-800 px-3 sm:px-6 py-2 text-sm sm:text-base min-h-[44px]">Thesis</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 sm:space-y-8">
            <OverviewTab data={data} timeframe={timeframe} setTimeframe={setTimeframe} />
          </TabsContent>

          <TabsContent value="technical" className="space-y-6 sm:space-y-8">
            <TechnicalTab data={data} />
          </TabsContent>

          <TabsContent value="sentiment" className="space-y-6 sm:space-y-8">
            <SentimentTab data={data} />
          </TabsContent>

          <TabsContent value="thesis" className="space-y-6 sm:space-y-8">
            <ThesisTab data={data} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// ============================================================================
// Stock Overview Card - Responsive padding
// ============================================================================

const StockOverviewCard = ({ data }) => {
  const recommendationConfig = {
    BUY: COLORS.positive,
    SELL: COLORS.negative,
    HOLD: COLORS.neutral
  }[data.recommendation] || COLORS.neutral;

  return (
    <Card className="border-gray-800/50 bg-gray-900/95 backdrop-blur-xl w-full">
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 xl:gap-8">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-3">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-50">{data.company}</h2>
              <Badge variant="outline" className="border-gray-700 bg-gray-800/50 text-gray-300 px-2 py-0.5 sm:px-3 sm:py-1 text-sm sm:text-base">
                {symbol}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm sm:text-base text-gray-400">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Updated: {data.lastUpdated?.toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="text-right">
              <p className="text-xs sm:text-sm text-gray-400 mb-1">Recommendation</p>
              <Badge className={cn("text-base sm:text-xl px-3 sm:px-6 py-1.5 sm:py-2.5", recommendationConfig.badge)}>
                {data.recommendation}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-xs sm:text-sm text-gray-400 mb-1">Confidence</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-50">
                {Math.round(data.confidence * 100)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 min-w-[160px] sm:min-w-[200px]">
            <div>
              <p className="text-xs sm:text-sm text-gray-400">Price</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-50">${data.technical.currentPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-400">Sentiment</p>
              <p className={cn(
                "text-xl sm:text-2xl font-bold",
                data.sentiment >= 60 ? 'text-emerald-400' :
                data.sentiment <= 40 ? 'text-rose-400' : 'text-gray-50'
              )}>
                {Math.round(data.sentiment)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Overview Tab - Responsive grids
// ============================================================================

const OverviewTab = ({ data, timeframe, setTimeframe }) => {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <Card className="border-gray-800/50 bg-gray-900/95 lg:col-span-1">
          <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-sm sm:text-base font-medium text-gray-400">Current Price</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-3xl sm:text-4xl font-bold text-gray-50 mb-4 sm:mb-6">
              ${data.technical.currentPrice.toFixed(2)}
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-400">SMA 50</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-lg sm:text-xl font-semibold text-gray-50">
                    ${data.technical.sma50.toFixed(2)}
                  </span>
                  <ArrowIndicator direction={data.technical.sma50Diff >= 0 ? 'up' : 'down'} value={data.technical.sma50Diff} />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-400">SMA 200</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-lg sm:text-xl font-semibold text-gray-50">
                    ${data.technical.sma200.toFixed(2)}
                  </span>
                  <ArrowIndicator direction={data.technical.sma200Diff >= 0 ? 'up' : 'down'} value={data.technical.sma200Diff} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/95 lg:col-span-1">
          <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-sm sm:text-base font-medium text-gray-400">Market Sentiment</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="mb-4 sm:mb-6">
              <div className="flex justify-between items-center mb-2 sm:mb-3">
                <span className="text-sm sm:text-base text-gray-400">Sentiment Score</span>
                <span className={cn(
                  "text-2xl sm:text-3xl font-bold",
                  data.sentiment >= 60 ? 'text-emerald-400' :
                  data.sentiment <= 40 ? 'text-rose-400' : 'text-gray-50'
                )}>
                  {Math.round(data.sentiment)}%
                </span>
              </div>
              <Progress 
                value={data.sentiment} 
                className="h-2 sm:h-3 bg-gray-700"
                indicatorClassName={cn(
                  "bg-gradient-to-r",
                  data.sentiment >= 60 ? COLORS.positive.gradient :
                  data.sentiment <= 40 ? COLORS.negative.gradient :
                  COLORS.neutral.gradient
                )}
              />
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-gray-500">
              <span>Bearish</span>
              <span>Neutral</span>
              <span>Bullish</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/95 lg:col-span-1">
          <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-sm sm:text-base font-medium text-gray-400">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-xs sm:text-sm text-gray-400">RSI (14)</p>
                <p className={cn(
                  "text-xl sm:text-2xl font-bold",
                  data.technical.rsi > 70 ? 'text-rose-400' :
                  data.technical.rsi < 30 ? 'text-emerald-400' : 'text-gray-50'
                )}>
                  {data.technical.rsi.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Volume</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-50">
                  {(data.technical.volume / 1000000).toFixed(1)}M
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Support</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-50">${data.technical.support.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Resistance</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-50">${data.technical.resistance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-800/50 bg-gray-900/95">
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-base sm:text-lg text-gray-200">Price Targets</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <TargetCard label="Bearish Case" value={data.targets.bearish} current={data.technical.currentPrice} diff={data.targets.bearishDiff} variant="bear" />
            <TargetCard label="Base Case" value={data.targets.base} current={data.technical.currentPrice} diff={0} variant="base" />
            <TargetCard label="Bullish Case" value={data.targets.bullish} current={data.technical.currentPrice} diff={data.targets.bullishDiff} variant="bull" />
          </div>
        </CardContent>
      </Card>

      {data.factors.length > 0 && (
        <Card className="border-gray-800/50 bg-gray-900/95">
          <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-base sm:text-lg text-gray-200">Investment Thesis</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-4 sm:space-y-6">
              {data.factors.map((factor, index) => (
                <div key={index} className="flex gap-3 sm:gap-4">
                  <div className={cn(
                    "w-1 flex-shrink-0 rounded-full",
                    factor.impact === 'positive' ? 'bg-emerald-500' :
                    factor.impact === 'negative' ? 'bg-rose-500' : 'bg-blue-500'
                  )} />
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-200">{factor.title}</h4>
                    <p className="text-sm sm:text-base text-gray-400 mt-1 sm:mt-2">{factor.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

// ============================================================================
// Technical Tab
// ============================================================================

const TechnicalTab = ({ data }) => {
  return (
    <div className="space-y-6 sm:space-y-8">
      <Card className="border-gray-800/50 bg-gray-900/95">
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-base sm:text-lg text-gray-200">Momentum Indicators</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base text-gray-400">RSI (14)</span>
                <Badge className={cn(
                  "px-3 sm:px-4 py-1 sm:py-1.5 text-sm sm:text-base",
                  data.technical.rsi > 70 ? COLORS.negative.badge :
                  data.technical.rsi < 30 ? COLORS.positive.badge :
                  COLORS.neutral.badge
                )}>
                  {data.technical.rsi > 70 ? 'Overbought' :
                   data.technical.rsi < 30 ? 'Oversold' : 'Neutral'}
                </Badge>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-50">
                {data.technical.rsi.toFixed(1)}
              </div>
              <Progress 
                value={data.technical.rsi} 
                className="h-2 sm:h-3 bg-gray-700"
                indicatorClassName={cn(
                  data.technical.rsi > 70 ? 'bg-rose-500' :
                  data.technical.rsi < 30 ? 'bg-emerald-500' : 'bg-blue-500'
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="p-4 sm:p-5 rounded-lg bg-gray-800/30 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <TrendUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                  <span className="text-sm sm:text-base text-gray-400">Support</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-50">${data.technical.support.toFixed(2)}</p>
                <p className={cn(
                  "text-xs sm:text-sm mt-1 sm:mt-2",
                  data.technical.supportDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                )}>
                  {data.technical.supportDiff >= 0 ? 'Above' : 'Below'} by {Math.abs(data.technical.supportDiff).toFixed(1)}%
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-lg bg-gray-800/30 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <TrendDown className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400" />
                  <span className="text-sm sm:text-base text-gray-400">Resistance</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-50">${data.technical.resistance.toFixed(2)}</p>
                <p className={cn(
                  "text-xs sm:text-sm mt-1 sm:mt-2",
                  data.technical.resistanceDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                )}>
                  {data.technical.resistanceDiff >= 0 ? 'Above' : 'Below'} by {Math.abs(data.technical.resistanceDiff).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-800/50 bg-gray-900/95">
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-base sm:text-lg text-gray-200">Moving Averages</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <MetricCard label="SMA 50" value={data.technical.sma50} current={data.technical.currentPrice} diff={data.technical.sma50Diff} icon={<Layers className="h-4 w-4 sm:h-5 sm:w-5" />} />
            <MetricCard label="SMA 200" value={data.technical.sma200} current={data.technical.currentPrice} diff={data.technical.sma200Diff} icon={<Layers className="h-4 w-4 sm:h-5 sm:w-5" />} />
          </div>
          <div className="mt-4 sm:mt-6 p-4 sm:p-5 rounded-lg bg-gray-800/30 border border-gray-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <span className="text-sm sm:text-base text-gray-400">Trend Direction</span>
              <Badge className={cn("px-3 sm:px-4 py-1 sm:py-1.5 text-sm sm:text-base", data.technical.isUptrend ? COLORS.positive.badge : COLORS.negative.badge)}>
                {data.technical.isUptrend ? 'Uptrend' : 'Downtrend'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// Sentiment Tab - Responsive
// ============================================================================

const SentimentTab = ({ data }) => {
  const distribution = {
    positive: Math.round(data.sentiment * 0.8),
    neutral: Math.round(30 - Math.abs(data.sentiment - 50) * 0.2),
    negative: 100 - Math.round(data.sentiment * 0.8 + (30 - Math.abs(data.sentiment - 50) * 0.2))
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <Card className="border-gray-800/50 bg-gray-900/95">
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-base sm:text-lg text-gray-200">Sentiment Analysis</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-1">
              <div className="text-center p-4 sm:p-8 rounded-lg bg-gray-800/30 border border-gray-700/50">
                <p className="text-sm sm:text-base text-gray-400 mb-2 sm:mb-3">Overall Sentiment</p>
                <p className={cn(
                  "text-4xl sm:text-5xl font-bold",
                  data.sentiment >= 60 ? 'text-emerald-400' :
                  data.sentiment <= 40 ? 'text-rose-400' : 'text-gray-50'
                )}>
                  {Math.round(data.sentiment)}%
                </p>
                <Badge className={cn(
                  "mt-3 sm:mt-4 px-3 sm:px-4 py-1 sm:py-1.5 text-sm sm:text-base",
                  data.sentiment >= 60 ? COLORS.positive.badge :
                  data.sentiment <= 40 ? COLORS.negative.badge :
                  COLORS.neutral.badge
                )}>
                  {data.sentiment >= 60 ? 'Bullish' :
                   data.sentiment <= 40 ? 'Bearish' : 'Neutral'}
                </Badge>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <DistributionCard label="Positive" value={distribution.positive} color="emerald" />
                <DistributionCard label="Neutral" value={distribution.neutral} color="blue" />
                <DistributionCard label="Negative" value={distribution.negative} color="rose" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-800/50 bg-gray-900/95">
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-base sm:text-lg text-gray-200">News Coverage</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <SourceMetric label="Total Articles" value={data.news.count} icon={<Newspaper className="h-4 w-4 sm:h-5 sm:w-5" />} />
            <SourceMetric label="Tier 1 Sources" value={data.news.tier1Sources} icon={<Shield className="h-4 w-4 sm:h-5 sm:w-5" />} />
            <SourceMetric label="Top Source" value={data.news.topSource} icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5" />} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// Thesis Tab - Responsive
// ============================================================================

const ThesisTab = ({ data }) => {
  if (!data.factors.length) {
    return (
      <Card className="border-gray-800/50 bg-gray-900/95">
        <CardContent className="p-8 sm:p-12 text-center">
          <p className="text-base sm:text-lg text-gray-400">No investment thesis available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-800/50 bg-gray-900/95">
      <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-base sm:text-lg text-gray-200">Investment Thesis</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="space-y-4 sm:space-y-6">
          {data.factors.map((factor, index) => (
            <div key={index} className="flex gap-4 sm:gap-5 p-4 sm:p-5 rounded-lg bg-gray-800/30 border border-gray-700/50">
              <div className={cn(
                "w-1 sm:w-1.5 flex-shrink-0 rounded-full",
                factor.impact === 'positive' ? 'bg-emerald-500' :
                factor.impact === 'negative' ? 'bg-rose-500' : 'bg-blue-500'
              )} />
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-200 mb-1 sm:mb-2">{factor.title}</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{factor.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Helper Components
// ============================================================================

const ArrowIndicator = ({ direction, value }) => {
  if (direction === 'up') {
    return (
      <div className="flex items-center gap-1 text-emerald-400">
        <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="text-xs sm:text-sm font-medium">+{Math.abs(value).toFixed(1)}%</span>
      </div>
    );
  }
  if (direction === 'down') {
    return (
      <div className="flex items-center gap-1 text-rose-400">
        <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="text-xs sm:text-sm font-medium">-{Math.abs(value).toFixed(1)}%</span>
      </div>
    );
  }
  return null;
};

const TargetCard = ({ label, value, current, diff, variant }) => {
  const config = {
    bear: COLORS.negative,
    bull: COLORS.positive,
    base: COLORS.neutral
  }[variant] || COLORS.neutral;

  return (
    <div className={cn("p-4 sm:p-6 rounded-lg border", config.bg, config.border)}>
      <p className="text-sm sm:text-base text-gray-400 mb-1 sm:mb-2">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-50">${value.toFixed(2)}</p>
      {diff !== 0 && (
        <p className={cn("text-sm sm:text-base mt-2 sm:mt-3", config.text)}>
          {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
        </p>
      )}
    </div>
  );
};

const MetricCard = ({ label, value, current, diff, icon }) => (
  <div className="p-4 sm:p-6 rounded-lg bg-gray-800/30 border border-gray-700/50">
    <div className="flex items-center gap-2 mb-2 sm:mb-3">
      <span className="text-gray-400">{icon}</span>
      <span className="text-sm sm:text-base text-gray-400">{label}</span>
    </div>
    <p className="text-xl sm:text-2xl font-bold text-gray-50">${value.toFixed(2)}</p>
    <p className={cn("text-xs sm:text-sm mt-1 sm:mt-2", diff >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
      {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
    </p>
  </div>
);

const DistributionCard = ({ label, value, color }) => (
  <div className="p-4 sm:p-6 rounded-lg bg-gray-800/30 border border-gray-700/50 text-center">
    <p className={cn(
      "text-sm sm:text-base mb-1 sm:mb-2",
      color === 'emerald' ? 'text-emerald-400' :
      color === 'rose' ? 'text-rose-400' : 'text-blue-400'
    )}>{label}</p>
    <p className="text-2xl sm:text-3xl font-bold text-gray-50">{value}%</p>
  </div>
);

const SourceMetric = ({ label, value, icon }) => (
  <div className="p-4 sm:p-6 rounded-lg bg-gray-800/30 border border-gray-700/50">
    <div className="flex items-center gap-2 mb-2 sm:mb-3">
      <span className="text-gray-400">{icon}</span>
      <span className="text-sm sm:text-base text-gray-400">{label}</span>
    </div>
    <p className="text-xl sm:text-2xl font-bold text-gray-50">{value}</p>
  </div>
);

// ============================================================================
// Loading Skeleton - Responsive
// ============================================================================

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-950">
    <div className="border-b border-gray-800/50 bg-gray-900/95 p-4 sm:p-6">
      <div className="max-w-[90rem] mx-auto">
        <Skeleton className="h-8 sm:h-10 w-56 sm:w-72 bg-gray-800" />
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-3">
          <Skeleton className="h-5 sm:h-6 w-20 sm:w-24 bg-gray-800" />
          <Skeleton className="h-5 sm:h-6 w-24 sm:w-28 bg-gray-800" />
        </div>
      </div>
    </div>
    <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <Skeleton className="h-40 rounded-xl bg-gray-800" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <Skeleton className="h-56 rounded-xl bg-gray-800" />
        <Skeleton className="h-56 rounded-xl bg-gray-800" />
        <Skeleton className="h-56 rounded-xl bg-gray-800" />
      </div>
      <Skeleton className="h-56 rounded-xl bg-gray-800" />
    </div>
  </div>
);

// ============================================================================
// Error Display - Responsive
// ============================================================================

const ErrorDisplay = ({ error, onRetry }) => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 sm:p-6">
    <Card className="border-rose-500/30 bg-rose-500/10 max-w-2xl w-full">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-rose-400 flex-shrink-0" />
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-rose-300 mb-1 sm:mb-2">Failed to load dashboard</h3>
            <p className="text-sm sm:text-base text-rose-200/80 mb-4 sm:mb-6">{error}</p>
            <Button onClick={onRetry} size="default" className="min-h-[44px] px-4 sm:px-6">Retry</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============================================================================
// PropTypes (unchanged)
// ============================================================================

StockDashboard.propTypes = {
  symbol: PropTypes.string
};

ArrowIndicator.propTypes = {
  direction: PropTypes.oneOf(['up', 'down']).isRequired,
  value: PropTypes.number.isRequired
};

TargetCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  diff: PropTypes.number.isRequired,
  variant: PropTypes.oneOf(['bear', 'bull', 'base']).isRequired
};

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  diff: PropTypes.number.isRequired,
  icon: PropTypes.node.isRequired
};

DistributionCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  color: PropTypes.oneOf(['emerald', 'rose', 'blue']).isRequired
};

SourceMetric.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.node.isRequired
};

ErrorDisplay.propTypes = {
  error: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired
};

export default StockDashboard;