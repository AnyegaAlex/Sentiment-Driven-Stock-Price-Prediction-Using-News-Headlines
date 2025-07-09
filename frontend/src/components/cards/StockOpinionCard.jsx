import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Info,
  AlertCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Activity,
  Shield,
  BarChart2,
  Clock,
  DollarSign,
  PieChart,
  Loader2
} from 'lucide-react';

const StockOpinionCard = ({ symbol, riskType = 'medium', holdTime = 'medium-term' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const response = await axios.get(`/api/stock-analysis`, {
        params: { symbol, risk_type: riskType, hold_time: holdTime },
        timeout: 10000
      });
      
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid API response structure');
      }

      setData({
        ...response.data,
        lastUpdated: response.data.lastUpdated || new Date().toISOString()
      });
    } catch (err) {
      setError({
        message: err.response?.data?.message || err.message || 'Failed to fetch stock analysis',
        status: err.response?.status
      });
      console.error('API Error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [symbol, riskType, holdTime]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 minute refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  // Memoized derived data
  const { 
    sentimentPercentage, 
    sentimentDirection,
    recommendationVariant,
    technicals,
    targets
  } = useMemo(() => {
    if (!data) return {};
    
    const sentiment = data.sentiment || 0;
    return {
      sentimentPercentage: Math.abs(sentiment * 100),
      sentimentDirection: sentiment > 0 ? 'up' : sentiment < 0 ? 'down' : 'neutral',
      _recommendationVariant: {
        BUY: 'success',
        SELL: 'destructive',
        HOLD: 'warning'
      }[data.recommendation] || 'default',
      technicals: {
        currentPrice: data.technicalIndicators?.currentPrice || 0,
        rsi: data.technicalIndicators?.rsi || 50,
        sma50: data.technicalIndicators?.sma50 || 0,
        sma200: data.technicalIndicators?.sma200 || 0,
        support: data.technicalIndicators?.support || 0,
        resistance: data.technicalIndicators?.resistance || 0
      },
      targets: {
        base: data.priceTargets?.base || data.technicalIndicators?.currentPrice || 0,
        bullish: data.priceTargets?.bullish || (data.technicalIndicators?.currentPrice || 0) * 1.15,
        bearish: data.priceTargets?.bearish || (data.technicalIndicators?.currentPrice || 0) * 0.85
      }
    };
  }, [data]);

  if (loading && !isRefreshing) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchData} />;
  }

  if (!data) {
    return <NoDataDisplay symbol={symbol} />;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold text-white">
              {data.company || symbol} ({symbol})
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1 text-gray-400">
              <Clock className="h-4 w-4" />
              {new Date(data.lastUpdated).toLocaleString()}
            </CardDescription>
          </div>
          <RecommendationBadges 
            recommendation={data.recommendation} 
            confidence={data.confidence} 
          />
        </div>
      </CardHeader>

      <Separator className="bg-gray-800" />

      <CardContent className="pt-6 grid gap-6">
        <PriceAndSentiment 
          currentPrice={technicals.currentPrice}
          sma50={technicals.sma50}
          sma200={technicals.sma200}
          sentimentPercentage={sentimentPercentage}
          sentimentDirection={sentimentDirection}
        />

        <TechnicalIndicatorsSection 
          rsi={technicals.rsi}
          support={technicals.support}
          resistance={technicals.resistance}
          currentPrice={technicals.currentPrice}
        />

        <PriceTargetsSection 
          targets={targets}
          currentPrice={technicals.currentPrice}
        />

        {data.keyFactors?.length > 0 && (
          <KeyFactorsSection factors={data.keyFactors} />
        )}
      </CardContent>

      <AnalysisCardFooter
        lastUpdated={data.lastUpdated} 
        onRefresh={fetchData} 
        isRefreshing={isRefreshing} 
      />
    </Card>
  );
};

// Sub-components
const LoadingSkeleton = () => (
  <Card className="w-full max-w-4xl mx-auto bg-gray-900 border-gray-800">
    <CardHeader>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-10 w-10 rounded-full bg-gray-800" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px] bg-gray-800" />
          <Skeleton className="h-4 w-[150px] bg-gray-800" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[100px] bg-gray-800" />
        ))}
      </div>
      <Skeleton className="h-[200px] bg-gray-800" />
    </CardContent>
  </Card>
);

const ErrorDisplay = ({ error, onRetry }) => (
  <Alert variant="destructive" className="w-full max-w-4xl mx-auto bg-red-900/20 border-red-800">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Analysis Error</AlertTitle>
    <AlertDescription className="text-red-300">
      {error.message} {error.status && `(Status: ${error.status})`}
    </AlertDescription>
    <Button 
      variant="outline" 
      size="sm" 
      className="mt-2 border-red-800 text-red-300 hover:text-red-100 hover:bg-red-900/30"
      onClick={onRetry}
      aria-label="Retry fetching data"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  </Alert>
);

const NoDataDisplay = ({ symbol }) => (
  <Alert variant="default" className="w-full max-w-4xl mx-auto bg-gray-900 border-gray-800">
    <Info className="h-4 w-4 text-blue-400" />
    <AlertTitle className="text-white">No Data Available</AlertTitle>
    <AlertDescription className="text-gray-400">
      Could not retrieve analysis for {symbol}. Please try another stock.
    </AlertDescription>
  </Alert>
);

const RecommendationBadges = ({ recommendation, confidence }) => (
  <div className="flex items-center gap-2">
    <Badge 
      variant={{
        BUY: 'success',
        SELL: 'destructive',
        HOLD: 'warning'
      }[recommendation] || 'default'} 
      className="px-3 py-1 text-sm uppercase"
      aria-label={`Recommendation: ${recommendation}`}
    >
      {recommendation}
    </Badge>
    <Badge variant="outline" className="px-3 py-1 text-sm bg-gray-800 text-gray-300 border-gray-700">
      Confidence: {Math.round((confidence || 0) * 100)}%
    </Badge>
  </div>
);

const PriceAndSentiment = ({ currentPrice, sma50, sma200, sentimentPercentage, sentimentDirection }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="border border-gray-800 rounded-lg p-4 bg-gray-800/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Current Price
        </h3>
        <Tooltip>
          <TooltipTrigger aria-label="Current price information">
            <Info className="h-4 w-4 text-gray-500" />
          </TooltipTrigger>
          <TooltipContent className="bg-gray-800 border border-gray-700 text-white">
            Latest market price from our data feed
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-2xl font-bold mt-2 text-white">
        ${currentPrice.toFixed(2)}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-xs bg-gray-800 text-gray-300 border-gray-700">
          SMA50: ${sma50.toFixed(2)}
        </Badge>
        <Badge variant="outline" className="text-xs bg-gray-800 text-gray-300 border-gray-700">
          SMA200: ${sma200.toFixed(2)}
        </Badge>
      </div>
    </div>

    <div className="border border-gray-800 rounded-lg p-4 bg-gray-800/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          {sentimentDirection === 'up' ? (
            <ArrowUp className="h-4 w-4 text-green-500" />
          ) : sentimentDirection === 'down' ? (
            <ArrowDown className="h-4 w-4 text-red-500" />
          ) : (
            <Activity className="h-4 w-4 text-yellow-500" />
          )}
          Market Sentiment
        </h3>
        <span className="text-sm font-medium text-white">
          {sentimentPercentage.toFixed(1)}%
        </span>
      </div>
      <Progress 
        value={sentimentPercentage} 
        className="h-2 mt-2 bg-gray-700"
        indicatorClassName={
          sentimentDirection === 'up' ? 'bg-green-500' : 
          sentimentDirection === 'down' ? 'bg-red-500' : 'bg-yellow-500'
        }
        aria-label={`Sentiment level: ${sentimentPercentage.toFixed(1)}%`}
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Negative</span>
        <span>Neutral</span>
        <span>Positive</span>
      </div>
    </div>
  </div>
);

const TechnicalIndicatorsSection = ({ rsi, support, resistance, currentPrice }) => (
  <div className="border border-gray-800 rounded-lg p-4 bg-gray-800/50">
    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-white">
      <BarChart2 className="h-5 w-5 text-blue-400" />
      Technical Indicators
    </h3>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <TechnicalIndicatorCard 
        icon={<TrendingUp className="h-5 w-5 text-blue-400" />}
        title="RSI"
        value={rsi.toFixed(1)}
        status={
          rsi > 70 ? 'Overbought' : 
          rsi < 30 ? 'Oversold' : 'Neutral'
        }
        statusVariant={
          rsi > 70 ? 'destructive' : 
          rsi < 30 ? 'success' : 'default'
        }
      />
      <TechnicalIndicatorCard 
        icon={<Activity className="h-5 w-5 text-blue-400" />}
        title="Support"
        value={`$${support.toFixed(2)}`}
        status={
          currentPrice > support ? 
          'Above Support' : 'Below Support'
        }
      />
      <TechnicalIndicatorCard 
        icon={<Activity className="h-5 w-5 text-blue-400" />}
        title="Resistance"
        value={`$${resistance.toFixed(2)}`}
        status={
          currentPrice > resistance ? 
          'Broken Through' : 'Holding'
        }
      />
    </div>
  </div>
);

const TechnicalIndicatorCard = ({ icon, title, value, status, statusVariant = 'default' }) => {
  const variantClasses = {
    default: 'bg-gray-800 text-gray-300',
    destructive: 'bg-red-900/20 text-red-300',
    success: 'bg-green-900/20 text-green-300',
    warning: 'bg-yellow-900/20 text-yellow-300'
  };

  return (
    <div className="border border-gray-800 rounded-lg p-3 bg-gray-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-medium text-gray-400">{title}</h4>
        </div>
        <p className="text-sm font-bold text-white">{value}</p>
      </div>
      {status && (
        <Badge 
          variant={statusVariant} 
          className={`mt-2 text-xs ${variantClasses[statusVariant]}`}
        >
          {status}
        </Badge>
      )}
    </div>
  );
};

const PriceTargetsSection = ({ targets, currentPrice }) => (
  <div className="border border-gray-800 rounded-lg p-4 bg-gray-800/50">
    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-white">
      <PieChart className="h-5 w-5 text-blue-400" />
      Price Targets
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <PriceTargetCard 
        title="Bearish Scenario"
        value={targets.bearish}
        change={((targets.bearish - currentPrice) / currentPrice * 100).toFixed(1)}
        variant="destructive"
      />
      <PriceTargetCard 
        title="Base Case"
        value={targets.base}
        change={((targets.base - currentPrice) / currentPrice * 100).toFixed(1)}
        variant="default"
      />
      <PriceTargetCard 
        title="Bullish Scenario"
        value={targets.bullish}
        change={((targets.bullish - currentPrice) / currentPrice * 100).toFixed(1)}
        variant="success"
      />
    </div>
  </div>
);

const PriceTargetCard = ({ title, value, change, variant = 'default' }) => {
  const variantClasses = {
    default: 'border-blue-500 bg-blue-900/20 text-blue-100',
    success: 'border-green-500 bg-green-900/20 text-green-100',
    destructive: 'border-red-500 bg-red-900/20 text-red-100'
  };

  return (
    <div className={`border rounded-lg p-4 ${variantClasses[variant]}`}>
      <h4 className="text-sm font-medium">{title}</h4>
      <p className="text-2xl font-bold mt-1">${value.toFixed(2)}</p>
      <p className="text-sm mt-1">
        {parseFloat(change) > 0 ? '+' : ''}{change}% from current
      </p>
    </div>
  );
};

const KeyFactorsSection = ({ factors }) => (
  <div className="border border-gray-800 rounded-lg p-4 bg-gray-800/50">
    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-white">
      <Shield className="h-5 w-5 text-blue-400" />
      Key Investment Factors
    </h3>
    <ul className="space-y-3">
      {factors.map((factor, index) => (
        <li key={index} className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {factor.impact === 'positive' ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : factor.impact === 'negative' ? (
              <ArrowDown className="h-4 w-4 text-red-500" />
            ) : (
              <Info className="h-4 w-4 text-blue-500" />
            )}
          </div>
          <div>
            <p className="font-medium text-white">{factor.title}</p>
            <p className="text-sm text-gray-400">{factor.description}</p>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const AnalysisCardFooter = ({ lastUpdated, onRefresh, isRefreshing }) => (
  <div className="flex justify-between items-center py-4">
    <p className="text-sm text-gray-500">
      Analysis generated {new Date(lastUpdated).toLocaleTimeString()}
    </p>
    <Button 
      variant="outline" 
      size="sm"
      onClick={onRefresh}
      disabled={isRefreshing}
      className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
      aria-label="Refresh data"
    >
      {isRefreshing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 h-4 w-4" />
      )}
      Refresh Data
    </Button>
  </div>
);

AnalysisCardFooter.propTypes = {
  lastUpdated: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
  isRefreshing: PropTypes.bool.isRequired,
};

ErrorDisplay.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string.isRequired,
    status: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  onRetry: PropTypes.func.isRequired
};

NoDataDisplay.propTypes = {
  symbol: PropTypes.string.isRequired
};

RecommendationBadges.propTypes = {
  recommendation: PropTypes.string.isRequired,
  confidence: PropTypes.number
};

PriceAndSentiment.propTypes = {
  currentPrice: PropTypes.number.isRequired,
  sma50: PropTypes.number.isRequired,
  sma200: PropTypes.number.isRequired,
  sentimentPercentage: PropTypes.number.isRequired,
  sentimentDirection: PropTypes.oneOf(['up', 'down', 'neutral']).isRequired
};

StockOpinionCard.propTypes = {
  symbol: PropTypes.string.isRequired,
  riskType: PropTypes.oneOf(['low', 'medium', 'high']),
  holdTime: PropTypes.oneOf(['short-term', 'medium-term', 'long-term'])
};

StockOpinionCard.defaultProps = {
  riskType: 'medium',
  holdTime: 'medium-term'
};

TechnicalIndicatorCard.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  status: PropTypes.string,
  statusVariant: PropTypes.oneOf(['default', 'destructive', 'success', 'warning'])
};

TechnicalIndicatorsSection.propTypes = {
  rsi: PropTypes.number.isRequired,
  support: PropTypes.number.isRequired,
  resistance: PropTypes.number.isRequired,
  currentPrice: PropTypes.number.isRequired
};

PriceTargetCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  change: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['default', 'success', 'destructive'])
};

PriceTargetsSection.propTypes = {
  targets: PropTypes.shape({
    base: PropTypes.number.isRequired,
    bullish: PropTypes.number.isRequired,
    bearish: PropTypes.number.isRequired
  }).isRequired,
  currentPrice: PropTypes.number.isRequired
};

KeyFactorsSection.propTypes = {
  factors: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      impact: PropTypes.oneOf(['positive', 'negative', 'neutral'])
    })
  ).isRequired
};

export default StockOpinionCard;