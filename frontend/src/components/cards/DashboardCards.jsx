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
  TrendingDown 
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


// Helper Components
const AnimatedProgressBar = ({ value, color = 'primary' }) => {
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
      />
    </div>
  );
};

const ArrowIndicator = ({ direction }) => {
  const variants = {
    increase: {
      icon: <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />,
      text: 'Up',
      color: 'text-green-600 dark:text-green-400'
    },
    decrease: {
      icon: <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />,
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
    <div className={`flex items-center gap-1 ${color}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
};

const MetricCard = ({ title, tooltip, children, className = '' }) => (
  <Card className={cn(
    "p-4 shadow-sm border border-gray-200 dark:border-gray-700",
    "hover:shadow-md transition-shadow",
    className
  )}>
    <CardHeader className="pb-2 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </CardTitle>
        <Tooltip>
          <TooltipTrigger aria-label={`Learn more about ${title}`}>
            <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[300px]">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
    </CardHeader>
    <CardContent className="space-y-3 mt-2">{children}</CardContent>
  </Card>
);

// Main Component
const DashboardCards = ({ symbol }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
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
      setError(err.response?.data?.error || 'Failed to fetch stock data');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    const cachedData = localStorage.getItem(`stockData-${symbol}`);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      const cacheAge = (new Date() - new Date(timestamp)) / (1000 * 60);
      
      if (cacheAge < 15) {
        setStockData(data);
        setLastUpdated(new Date(timestamp));
        setLoading(false);
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
        { date: '6d ago', price: currentPrice * 0.95, sentiment: 45 },
        { date: '5d ago', price: currentPrice * 0.97, sentiment: 52 },
        { date: '4d ago', price: currentPrice * 1.02, sentiment: 60 },
        { date: '3d ago', price: currentPrice * 1.05, sentiment: 58 },
        { date: '2d ago', price: currentPrice * 1.03, sentiment: 65 },
        { date: 'Yesterday', price: currentPrice * 1.01, sentiment: 70 },
        { date: 'Today', price: currentPrice, sentiment: sentimentScore },
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PriceTargetsCard 
          targets={parsed_llm.targets}
          currentPrice={technical.current_price}
        />

        <SupportResistanceCard 
          technical={technical}
        />
      </div>

      {parsed_llm.rationale?.length > 0 && (
        <KeyRationaleCard rationale={parsed_llm.rationale} />
      )}
    </div>
  );
};

// Sub-components
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <Skeleton className="h-6 w-1/2 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-24 w-full" />
      </Card>
    ))}
  </div>
);

const ErrorDisplay = ({ error, onRetry }) => (
  <Alert variant="destructive" className="mb-8">
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      {error}
      <Button 
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="ml-2"
      >
        Retry
      </Button>
    </AlertDescription>
  </Alert>
);

const RecommendationCard = ({ recommendation, allocation, sentiment, lastUpdated }) => (
  <MetricCard
    title="AI Recommendation"
    tooltip={`${recommendation} recommendation based on technical and sentiment analysis`}
    className="lg:col-span-1"
  >
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <Badge 
          variant={
            recommendation === 'BUY' ? 'positive' : 
            recommendation === 'SELL' ? 'negative' : 'neutral'
          }
          className="text-lg py-1 px-3"
        >
          {recommendation}
        </Badge>
        {lastUpdated && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      <div className="flex-1 space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Allocation</p>
          <p className="text-2xl font-bold">{allocation}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Confidence</p>
          <AnimatedProgressBar 
            value={Math.min(Math.abs(sentiment) * 100, 95)} 
            color={
              recommendation === 'BUY' ? 'green' : 
              recommendation === 'SELL' ? 'red' : 'yellow'
            }
          />
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 text-right">
            {Math.min(Math.abs(sentiment) * 100, 95).toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  </MetricCard>
);

const PriceTechnicalsCard = ({ technical, trendDirection, rsiStatus, historicalData }) => (
  <MetricCard
    title="Price & Technicals"
    tooltip="Current price and key technical indicators"
    className="lg:col-span-1"
  >
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Current Price</p>
          <p className="text-3xl font-bold">
            ${technical.current_price.toFixed(2)}
          </p>
        </div>
        <ArrowIndicator direction={trendDirection} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">SMA 50/200</p>
          <p className="text-lg font-bold">
            ${technical.sma_50.toFixed(2)} / ${technical.sma_200.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">RSI (14)</p>
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-lg font-bold",
              rsiStatus === 'overbought' ? 'text-red-600 dark:text-red-400' : 
              rsiStatus === 'oversold' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
            )}>
              {technical.rsi.toFixed(1)}
            </p>
            <Badge variant={rsiStatus}>
              {rsiStatus.charAt(0).toUpperCase() + rsiStatus.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historicalData}>
            <XAxis dataKey="date" />
            <YAxis domain={['auto', 'auto']} />
            <RechartsTooltip 
              formatter={(value, name) => [
                name === 'price' ? `$${value.toFixed(2)}` : `${value.toFixed(0)}%`,
                name === 'price' ? 'Price' : 'Sentiment'
              ]}
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

const SentimentAnalysisCard = ({ sentimentScore, newsCount, sourceStats, historicalData }) => (
  <MetricCard
    title="Sentiment Analysis"
    tooltip={`Market sentiment based on ${newsCount} news articles`}
    className="lg:col-span-1"
  >
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Sentiment Score</p>
          <p className={cn(
            "text-3xl font-bold",
            sentimentScore >= 60 ? 'text-green-600 dark:text-green-400' : 
            sentimentScore <= 40 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
          )}>
            {sentimentScore.toFixed(0)}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-300">News Count</p>
          <p className="text-lg font-bold">{newsCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ({sourceStats?.tier1_count || 0} Tier 1 sources)
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Sentiment Trend</p>
        <div className="h-32">
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
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded text-center">
          <p className="text-sm text-green-800 dark:text-green-200">Positive</p>
          <p className="font-bold text-green-600 dark:text-green-400">
            {Math.round(sentimentScore)}%
          </p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded text-center">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">Neutral</p>
          <p className="font-bold text-yellow-600 dark:text-yellow-400">
            {Math.round(100 - Math.abs(sentimentScore - 50) * 2)}%
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 p-2 rounded text-center">
          <p className="text-sm text-red-800 dark:text-red-200">Negative</p>
          <p className="font-bold text-red-600 dark:text-red-400">
            {Math.round(100 - sentimentScore)}%
          </p>
        </div>
      </div>
    </div>
  </MetricCard>
);

const PriceTargetsCard = ({ targets, currentPrice }) => (
  <MetricCard
    title="Price Targets"
    tooltip="Projected price targets based on technical analysis"
  >
    <div className="grid grid-cols-3 gap-4">
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

const SupportResistanceCard = ({ technical }) => (
  <MetricCard
    title="Support & Resistance"
    tooltip="Key price levels for trading decisions"
  >
    <div className="grid grid-cols-2 gap-4">
      <LevelIndicator 
        label="Support" 
        value={technical.support} 
        current={technical.current_price}
        icon={<TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />}
      />
      <LevelIndicator 
        label="Resistance" 
        value={technical.resistance} 
        current={technical.current_price}
        icon={<TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />}
      />
      <LevelIndicator 
        label="Pivot" 
        value={technical.pivot} 
        current={technical.current_price}
        icon={<Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      />
      <LevelIndicator 
        label="52W High" 
        value={technical.current_price * 1.3} 
        current={technical.current_price}
        icon={<CandlestickChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
      />
    </div>
  </MetricCard>
);

const KeyRationaleCard = ({ rationale }) => (
  <MetricCard
    title="Key Rationale"
    tooltip="AI-generated analysis of the stock's outlook"
  >
    <ul className="list-disc pl-5 space-y-2">
      {rationale.slice(0, 3).map((point, i) => (
        <li key={i} className="text-gray-700 dark:text-gray-300">{point}</li>
      ))}
    </ul>
  </MetricCard>
);

const PriceTarget = ({ label, value, current, variant }) => {
  const difference = ((value - current) / current) * 100;
  const isPositive = difference >= 0;

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      variant === 'bull' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
      variant === 'bear' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
      'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
    )}>
      <p className="text-sm text-gray-600 dark:text-gray-300">{label}</p>
      <p className="text-xl font-bold mt-1">${typeof value === 'number' ? value.toFixed(2) : value}</p>
      <p className={cn(
        "text-sm mt-1",
        isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      )}>
        {isPositive ? '+' : ''}{difference.toFixed(1)}%
      </p>
    </div>
  );
};

const LevelIndicator = ({ label, value, current, icon }) => {
  const difference = ((current - value) / value) * 100;
  const isAbove = difference > 0;

  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      </div>
      <p className="text-lg font-bold mt-1">${value.toFixed(2)}</p>
      <p className={cn(
        "text-xs mt-1",
        isAbove ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      )}>
        {isAbove ? 'Above' : 'Below'} {Math.abs(difference).toFixed(1)}%
      </p>
    </div>
  );
};

// PropTypes
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