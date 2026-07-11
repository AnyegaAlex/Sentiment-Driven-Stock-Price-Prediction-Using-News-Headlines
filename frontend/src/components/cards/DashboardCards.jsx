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
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { 
  Info, 
  ArrowUp, 
  ArrowDown, 
  Gauge, 
  CandlestickChart, 
  TrendingUp, 
  TrendingDown,
  AlertCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fetchMockStockAnalysis } from '@/services/mockStockAnalysis';

// Helper Components
const AnimatedProgressBar = ({ value, color = 'primary', ariaLabel = "Progress bar" }) => {
  const colorClasses = {
    primary: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  };

  return (
    <div className="relative w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClasses[color]} transition-all duration-500 ease-out`}
        style={{ width: `${value}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={ariaLabel}
      />
    </div>
  );
};

const ArrowIndicator = ({ direction, ariaLabel }) => {
  const variants = {
    increase: {
      icon: <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden="true" />,
      text: 'Up',
      color: 'text-green-600 dark:text-green-400'
    },
    decrease: {
      icon: <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />,
      text: 'Down',
      color: 'text-red-600 dark:text-red-400'
    },
    neutral: {
      icon: <span className="text-sm">—</span>,
      text: 'Flat',
      color: 'text-gray-500 dark:text-gray-400'
    }
  };

  const { icon, text, color } = variants[direction] || variants.neutral;

  return (
    <div className={`flex items-center gap-1 ${color}`} aria-label={ariaLabel || `${direction} trend`}>
      {icon}
      <span>{text}</span>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const DashboardCards = ({ symbol }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const IS_MOCK = process.env.NODE_ENV === 'production';
  
  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (IS_MOCK) {
        const mockData = await fetchMockStockAnalysis(symbol, 'high', 'long-term');
        setStockData(mockData);
        setLastUpdated(new Date());
        return;
      }

      const response = await axios.get(`/api/stock-analysis`, {
        params: {
          symbol,
          risk_type: 'high',
          hold_time: 'long-term',
          detail_level: 'detailed'
        },
        timeout: 10000
      });

      setStockData(response.data);
      setLastUpdated(new Date());
      localStorage.setItem(`stockData-${symbol}`, JSON.stringify({
        data: response.data,
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      const cachedData = localStorage.getItem(`stockData-${symbol}`);
      if (!cachedData) {
        setError(err.response?.data?.error || 'Failed to fetch stock data');
      }
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, IS_MOCK]);

  useEffect(() => {
    const cachedData = localStorage.getItem(`stockData-${symbol}`);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      const cacheAge = (new Date() - new Date(timestamp)) / (1000 * 60);
      
      if (cacheAge < 15) {
        setStockData(data);
        setLastUpdated(new Date(timestamp));
        setLoading(false);
        setError(null);
        return;
      }
    }
    
    fetchStockData();
  }, [symbol, fetchStockData]);

  // Processed data
  const { technical, sentiment, parsed_llm, source_stats, news_count } = stockData || {};
  
  const sentimentScore = useMemo(() => {
    return sentiment ? ((sentiment + 1) / 2) * 100 : 0;
  }, [sentiment]);

  const { rsiStatus, trendDirection, historicalData } = useMemo(() => {
    if (!technical) return {};
    
    const currentPrice = technical.current_price || 0;
    return {
      rsiStatus: technical.rsi > 70 ? 'overbought' : technical.rsi < 30 ? 'oversold' : 'neutral',
      trendDirection: technical.sma_50 > technical.sma_200 ? 'increase' : 'decrease',
      historicalData: [
        { date: '6d', price: currentPrice * 0.95, sentiment: 45 },
        { date: '5d', price: currentPrice * 0.97, sentiment: 52 },
        { date: '4d', price: currentPrice * 1.02, sentiment: 60 },
        { date: '3d', price: currentPrice * 1.05, sentiment: 58 },
        { date: '2d', price: currentPrice * 1.03, sentiment: 65 },
        { date: '1d', price: currentPrice * 1.01, sentiment: 70 },
        { date: 'Now', price: currentPrice, sentiment: sentimentScore },
      ]
    };
  }, [technical, sentimentScore]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchStockData} />;
  }

  if (!stockData || !technical) return null;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-3 sm:px-4 lg:px-6 xl:px-8 max-w-7xl xl:max-w-[90rem] mx-auto">
      {/* Top Row - Progressive columns with increased spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 xl:gap-8">
        <RecommendationCard 
          recommendation={parsed_llm.recommendation}
          allocation={parsed_llm.allocation}
          sentiment={sentiment}
          lastUpdated={lastUpdated}
        />

        <PriceTechnicalsCard 
          technical={technical}
          trendDirection={trendDirection}
          rsiStatus={rsiStatus}
          historicalData={historicalData}
        />

        <SentimentAnalysisCard 
          sentimentScore={sentimentScore}
          newsCount={news_count}
          sourceStats={source_stats}
          historicalData={historicalData}
        />
      </div>

      {/* Middle Row - 2 columns with increased spacing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 xl:gap-8">
        <PriceTargetsCard 
          targets={parsed_llm.targets}
          currentPrice={technical.current_price}
        />

        <SupportResistanceCard 
          technical={technical}
        />
      </div>

      {/* Full width rationale card with increased padding */}
      {parsed_llm.rationale?.length > 0 && (
        <div className="w-full">
          <KeyRationaleCard rationale={parsed_llm.rationale} />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Metric Card (Base Component) - Enhanced for larger screens
// ============================================================================

const MetricCard = ({ title, tooltip, children, className = '', ariaLabel }) => (
  <Card 
    className={cn(
      "p-4 sm:p-5 lg:p-6 xl:p-7 shadow-sm border border-gray-200 dark:border-gray-700",
      "hover:shadow-md transition-shadow duration-200",
      "w-full h-full flex flex-col",
      className
    )}
    aria-label={ariaLabel || `${title} card`}
  >
    <CardHeader className="pb-3 lg:pb-4 border-b border-gray-200 dark:border-gray-700 px-0">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate pr-2">
          {title}
        </CardTitle>
        <Tooltip>
          <TooltipTrigger className="focus:outline-none flex-shrink-0">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs sm:text-sm max-w-[250px] sm:max-w-[350px] p-3">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
    </CardHeader>
    <CardContent className="flex-1 space-y-3 sm:space-y-4 lg:space-y-5 mt-3 lg:mt-4 px-0">
      {children}
    </CardContent>
  </Card>
);

// ============================================================================
// Loading Skeleton - Enhanced for larger screens
// ============================================================================

const LoadingSkeleton = () => (
  <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 max-w-7xl xl:max-w-[90rem] mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 xl:gap-8">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-28 sm:w-32 lg:w-36" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <Skeleton className="h-[120px] sm:h-[140px] lg:h-[160px] w-full" />
          </div>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 xl:gap-8">
      <Skeleton className="h-48 sm:h-56 lg:h-64 rounded-lg" />
      <Skeleton className="h-48 sm:h-56 lg:h-64 rounded-lg" />
    </div>
  </div>
);

// ============================================================================
// Error Display - Enhanced
// ============================================================================

const ErrorDisplay = ({ error, onRetry }) => (
  <Alert variant="destructive" className="mb-6 mx-3 sm:mx-4 max-w-7xl xl:max-w-[90rem] mx-auto">
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div>
          <AlertTitle className="text-base sm:text-lg">Error Loading Data</AlertTitle>
          <AlertDescription className="text-sm sm:text-base">
            {error}
          </AlertDescription>
        </div>
      </div>
      <Button 
        variant="outline"
        size="default"
        onClick={onRetry}
        className="w-full sm:w-auto min-h-[44px] min-w-[44px]"
      >
        Retry
      </Button>
    </div>
  </Alert>
);

// ============================================================================
// Recommendation Card - Enhanced spacing
// ============================================================================

const RecommendationCard = ({ recommendation, allocation, sentiment, lastUpdated }) => (
  <MetricCard
    title="AI Recommendation"
    tooltip={`${recommendation} recommendation based on technical and sentiment analysis. Allocation suggestion: ${allocation}`}
    ariaLabel={`AI recommendation: ${recommendation}`}
  >
    <div className="flex flex-col h-full">
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-4">
        <Badge 
          variant={
            recommendation === 'BUY' ? 'positive' : 
            recommendation === 'SELL' ? 'negative' : 'neutral'
          }
          className="text-sm sm:text-base lg:text-lg py-1.5 px-3 lg:px-4 w-fit"
          aria-label={`Recommendation: ${recommendation}`}
        >
          {recommendation}
        </Badge>
        {lastUpdated && (
          <span className="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400" aria-label={`Last updated: ${lastUpdated.toLocaleTimeString()}`}>
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      
      <div className="flex-1 space-y-4 lg:space-y-5">
        <div>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 mb-1.5">Allocation</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold" aria-label={`Allocation: ${allocation}`}>{allocation}</p>
        </div>
        
        <div>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 mb-1.5">Confidence</p>
          <AnimatedProgressBar 
            value={Math.min(Math.abs(sentiment) * 100, 95)} 
            color={
              recommendation === 'BUY' ? 'green' : 
              recommendation === 'SELL' ? 'red' : 'yellow'
            }
            ariaLabel={`Confidence level: ${Math.min(Math.abs(sentiment) * 100, 95).toFixed(0)}%`}
          />
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 mt-1.5 text-right">
            {Math.min(Math.abs(sentiment) * 100, 95).toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  </MetricCard>
);

// ============================================================================
// Price & Technicals Card - Enhanced spacing and chart height
// ============================================================================

const PriceTechnicalsCard = ({ technical, trendDirection, rsiStatus, historicalData }) => (
  <MetricCard
    title="Price & Technicals"
    tooltip="Current price and key technical indicators including moving averages and RSI"
    ariaLabel="Price and technical indicators"
  >
    <div className="space-y-4 lg:space-y-5">
      <div className="flex flex-col xs:flex-row xs:items-end justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Current Price</p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold" aria-label={`Current price: $${technical.current_price.toFixed(2)}`}>
            ${technical.current_price.toFixed(2)}
          </p>
        </div>
        <ArrowIndicator direction={trendDirection} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        <div>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">SMA 50/200</p>
          <p className="text-sm sm:text-base lg:text-lg font-bold truncate" aria-label={`SMA 50: $${technical.sma_50.toFixed(2)}, SMA 200: $${technical.sma_200.toFixed(2)}`}>
            ${technical.sma_50.toFixed(2)} / ${technical.sma_200.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">RSI (14)</p>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <p 
              className={cn(
                "text-base sm:text-lg lg:text-xl font-bold",
                rsiStatus === 'overbought' ? 'text-red-600 dark:text-red-400' : 
                rsiStatus === 'oversold' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
              )}
              aria-label={`RSI: ${technical.rsi.toFixed(1)}, status: ${rsiStatus}`}
            >
              {technical.rsi.toFixed(1)}
            </p>
            <Badge variant={rsiStatus} className="text-xs sm:text-sm px-2 py-0.5" aria-label={rsiStatus}>
              {rsiStatus === 'overbought' ? 'Overbought' : 
               rsiStatus === 'oversold' ? 'Oversold' : 'Neutral'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="h-[120px] sm:h-[150px] lg:h-[180px] xl:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historicalData}>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={['auto', 'auto']} 
              tick={{ fontSize: 11 }}
              width={40}
            />
            <RechartsTooltip 
              formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
              contentStyle={{
                fontSize: '0.8rem',
                padding: '0.5rem 0.75rem'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </MetricCard>
);

// ============================================================================
// Sentiment Analysis Card - Enhanced spacing
// ============================================================================

const SentimentAnalysisCard = ({ sentimentScore, newsCount, sourceStats, historicalData }) => (
  <MetricCard
    title="Sentiment Analysis"
    tooltip={`Market sentiment based on ${newsCount} news articles from ${sourceStats?.tier1_count || 0} Tier 1 sources`}
    ariaLabel="Sentiment analysis"
  >
    <div className="space-y-4 lg:space-y-5">
      <div className="flex flex-col xs:flex-row justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Sentiment Score</p>
          <p 
            className={cn(
              "text-2xl sm:text-3xl lg:text-4xl font-bold",
              sentimentScore >= 60 ? 'text-green-600 dark:text-green-400' : 
              sentimentScore <= 40 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
            )}
            aria-label={`Sentiment score: ${sentimentScore.toFixed(0)}%`}
          >
            {sentimentScore.toFixed(0)}%
          </p>
        </div>
        <div className="text-left xs:text-right">
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">News Count</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold" aria-label={`News count: ${newsCount}`}>{newsCount}</p>
          <p className="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400">
            ({sourceStats?.tier1_count || 0} Tier 1)
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 mb-2">Sentiment Trend</p>
        <div className="h-[100px] sm:h-[120px] lg:h-[140px] xl:h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData}>
              <Area 
                type="monotone" 
                dataKey="sentiment" 
                stroke="#6366f6" 
                fill="#6366f620" 
                strokeWidth={2}
              />
              <RechartsTooltip 
                formatter={(value) => [`${value.toFixed(0)}%`, 'Sentiment']}
                contentStyle={{
                  fontSize: '0.8rem',
                  padding: '0.5rem 0.75rem'
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ✅ FIX: Stack sentiment distribution on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        <div className="bg-green-50 dark:bg-green-900/30 p-2 sm:p-3 lg:p-4 rounded-lg text-center">
          <p className="text-xs sm:text-sm lg:text-base text-green-800 dark:text-green-200">Positive</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">
            {Math.round(sentimentScore)}%
          </p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 sm:p-3 lg:p-4 rounded-lg text-center">
          <p className="text-xs sm:text-sm lg:text-base text-yellow-800 dark:text-yellow-200">Neutral</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {Math.round(100 - Math.abs(sentimentScore - 50) * 2)}%
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 p-2 sm:p-3 lg:p-4 rounded-lg text-center">
          <p className="text-xs sm:text-sm lg:text-base text-red-800 dark:text-red-200">Negative</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">
            {Math.round(100 - sentimentScore)}%
          </p>
        </div>
      </div>
    </div>
  </MetricCard>
);

// ============================================================================
// Price Targets Card - Enhanced spacing
// ============================================================================

const PriceTargetsCard = ({ targets, currentPrice }) => (
  <MetricCard
    title="Price Targets"
    tooltip="Projected price targets based on technical analysis and analyst consensus"
    ariaLabel="Price targets"
  >
    {/* ✅ FIX: Stack on mobile, 3 columns on sm and up */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 xl:gap-5">
      <PriceTarget 
        label="Base" 
        value={targets?.Base || currentPrice * 1.1} 
        current={currentPrice}
        variant="base"
      />
      <PriceTarget 
        label="Bull" 
        value={targets?.Bull || currentPrice * 1.25} 
        current={currentPrice}
        variant="bull"
      />
      <PriceTarget 
        label="Bear" 
        value={targets?.Bear || currentPrice * 0.85} 
        current={currentPrice}
        variant="bear"
      />
    </div>
  </MetricCard>
);

// ============================================================================
// Support & Resistance Card - Enhanced spacing
// ============================================================================

const SupportResistanceCard = ({ technical }) => (
  <MetricCard
    title="Support & Resistance"
    tooltip="Key price levels for trading decisions including pivot points"
    ariaLabel="Support and resistance levels"
  >
    <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:gap-5">
      <LevelIndicator 
        label="Support" 
        value={technical.support} 
        current={technical.current_price}
        icon={<TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 dark:text-green-400" aria-hidden="true" />}
      />
      <LevelIndicator 
        label="Resistance" 
        value={technical.resistance} 
        current={technical.current_price}
        icon={<TrendingDown className="w-4 h-4 lg:w-5 lg:h-5 text-red-600 dark:text-red-400" aria-hidden="true" />}
      />
      <LevelIndicator 
        label="Pivot" 
        value={technical.pivot} 
        current={technical.current_price}
        icon={<Gauge className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
      />
      <LevelIndicator 
        label="52W High" 
        value={technical.current_price * 1.3} 
        current={technical.current_price}
        icon={<CandlestickChart className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />}
      />
    </div>
  </MetricCard>
);

// ============================================================================
// Key Rationale Card - Enhanced spacing
// ============================================================================

const KeyRationaleCard = ({ rationale }) => (
  <MetricCard
    title="Key Rationale"
    tooltip="AI-generated analysis explaining the reasoning behind the recommendation"
    ariaLabel="Key rationale for recommendation"
  >
    <ul className="list-disc pl-5 sm:pl-6 lg:pl-7 space-y-2 lg:space-y-3">
      {rationale.slice(0, 3).map((point, i) => (
        <li key={i} className="text-sm sm:text-base lg:text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
          {point}
        </li>
      ))}
    </ul>
  </MetricCard>
);

// ============================================================================
// Price Target Component - Enhanced spacing
// ============================================================================

const PriceTarget = ({ label, value, current, variant }) => {
  const difference = ((value - current) / current) * 100;
  const isPositive = difference >= 0;

  return (
    <div 
      className={cn(
        "p-3 sm:p-4 lg:p-5 rounded-xl border",
        variant === 'bull' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
        variant === 'bear' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
        'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
      )}
      aria-label={`${label} price target: $${value.toFixed(2)}, ${isPositive ? 'up' : 'down'} ${Math.abs(difference).toFixed(1)}%`}
    >
      <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">{label}</p>
      <p className="text-lg sm:text-xl lg:text-2xl font-bold mt-1 truncate">
        ${typeof value === 'number' ? value.toFixed(2) : value}
      </p>
      <p className={cn(
        "text-sm sm:text-base lg:text-lg mt-1",
        isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      )}>
        {isPositive ? '+' : ''}{difference.toFixed(1)}%
      </p>
    </div>
  );
};

// ============================================================================
// Level Indicator Component - Enhanced spacing
// ============================================================================

const LevelIndicator = ({ label, value, current, icon }) => {
  const difference = ((current - value) / value) * 100;
  const isAbove = difference > 0;

  return (
    <div 
      className="p-3 sm:p-4 lg:p-5 rounded-xl border border-gray-200 dark:border-gray-700"
      aria-label={`${label}: $${value.toFixed(2)}, current price is ${isAbove ? 'above' : 'below'} by ${Math.abs(difference).toFixed(1)}%`}
    >
      <div className="flex items-center gap-2 lg:gap-3">
        {icon}
        <span className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">{label}</span>
      </div>
      <p className="text-lg sm:text-xl lg:text-2xl font-bold mt-2 truncate">${value.toFixed(2)}</p>
      <p className={cn(
        "text-xs sm:text-sm lg:text-base mt-1",
        isAbove ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      )}>
        {isAbove ? 'Above' : 'Below'} {Math.abs(difference).toFixed(1)}%
      </p>
    </div>
  );
};

// ============================================================================
// PropTypes
// ============================================================================

AnimatedProgressBar.propTypes = {
  value: PropTypes.number.isRequired,
  color: PropTypes.oneOf(['primary', 'green', 'red', 'yellow']),
};

ArrowIndicator.propTypes = {
  direction: PropTypes.oneOf(['increase', 'decrease', 'neutral']).isRequired,
};

ErrorDisplay.propTypes = {
  error: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired
};

RecommendationCard.propTypes = {
  recommendation: PropTypes.string.isRequired,
  allocation: PropTypes.string.isRequired,
  sentiment: PropTypes.number.isRequired,
  lastUpdated: PropTypes.instanceOf(Date)
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  tooltip: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  ariaLabel: PropTypes.string
};

PriceTarget.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  current: PropTypes.number.isRequired,
  variant: PropTypes.oneOf(['bull', 'bear', 'base']).isRequired
};

PriceTargetsCard.propTypes = {
  targets: PropTypes.shape({
    Base: PropTypes.number,
    Bull: PropTypes.number,
    Bear: PropTypes.number
  }),
  currentPrice: PropTypes.number.isRequired
};

PriceTechnicalsCard.propTypes = {
  technical: PropTypes.shape({
    current_price: PropTypes.number.isRequired,
    sma_50: PropTypes.number.isRequired,
    sma_200: PropTypes.number.isRequired,
    rsi: PropTypes.number.isRequired
  }).isRequired,
  trendDirection: PropTypes.oneOf(['increase', 'decrease']).isRequired,
  rsiStatus: PropTypes.oneOf(['overbought', 'oversold', 'neutral']).isRequired,
  historicalData: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    sentiment: PropTypes.number.isRequired
  })).isRequired
};

SentimentAnalysisCard.propTypes = {
  sentimentScore: PropTypes.number.isRequired,
  newsCount: PropTypes.number.isRequired,
  sourceStats: PropTypes.shape({
    tier1_count: PropTypes.number,
  }),
  historicalData: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    sentiment: PropTypes.number.isRequired,
    price: PropTypes.number
  })).isRequired
};

SupportResistanceCard.propTypes = {
  technical: PropTypes.shape({
    current_price: PropTypes.number.isRequired,
    support: PropTypes.number.isRequired,
    resistance: PropTypes.number.isRequired,
    pivot: PropTypes.number.isRequired
  }).isRequired
};

KeyRationaleCard.propTypes = {
  rationale: PropTypes.arrayOf(PropTypes.string).isRequired
};

LevelIndicator.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  icon: PropTypes.node.isRequired
};

DashboardCards.propTypes = {
  symbol: PropTypes.string.isRequired,
};

export default DashboardCards;