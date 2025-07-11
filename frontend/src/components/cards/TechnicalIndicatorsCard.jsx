import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
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
} from 'chart.js';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
};

import { 
  ArrowUp, 
  ArrowDown, 
  Gauge, 
  CandlestickChart,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchMockTechnicalData } from '@/services/mockTechnicalData';



// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TechnicalIndicatorsCard = ({ symbol }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('1d');

  useEffect(() => {
    const fetchData = async () => {
      try {
            setLoading(true);
            setError(null);
            
            // Try real API first, fall back to mock data
            let response;
            try {
              response = await axios.get(`/api/stock-opinion`, {
                params: { 
                  symbol,
                  detail_level: 'detailed',
                  timeframe 
                },
                timeout: 10000
              });
              
              if (!response.data?.technical) {
                throw new Error('Invalid API response structure');
              }
              
              setData(response.data);
            } catch (apiError) {
              console.warn("Using mock data due to API error:", apiError);
              const mockData = await fetchMockTechnicalData(symbol, timeframe);
              setData(mockData);
            }
          } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to fetch technical data');
            console.error('Error:', err);
          } finally {
            setLoading(false);
          }
        };

        fetchData();
      }, [symbol, timeframe]);

  const chartData = useMemo(() => {
    if (!data?.technical) return null;
    
    return {
      labels: ['6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Yesterday', 'Today'],
      datasets: [
        {
          label: 'Price',
          data: [
            data.technical.current_price * 0.95,
            data.technical.current_price * 0.97,
            data.technical.current_price * 1.02,
            data.technical.current_price * 1.05,
            data.technical.current_price * 1.03,
            data.technical.current_price * 1.01,
            data.technical.current_price
          ],
          borderColor: '#3b82f6',
          tension: 0.1,
          pointBackgroundColor: '#3b82f6'
        },
        {
          label: 'SMA 50',
          data: Array(7).fill(data.technical.sma_50),
          borderColor: '#eab308',
          borderDash: [5, 5],
          tension: 0
        },
        {
          label: 'SMA 200',
          data: Array(7).fill(data.technical.sma_200),
          borderColor: '#ef4444',
          borderDash: [5, 5],
          tension: 0
        }
      ]
    };
  }, [data]);

  const { isUptrend, isOversold, isOverbought } = useMemo(() => {
    if (!data?.technical) return {};
    return {
      isUptrend: data.technical.sma_50 > data.technical.sma_200,
      isOversold: data.technical.rsi < 30,
      isOverbought: data.technical.rsi > 70
    };
  }, [data]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  if (!data) {
    return null;
  }

  return (
    <Card className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
          <CardTitle className="text-lg sm:text-xl font-semibold">
            Technical Indicators
          </CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px]">
                Technical indicators for {symbol}
              </TooltipContent>
            </Tooltip>
          <TimeframeSelector 
            timeframe={timeframe} 
            onChange={setTimeframe} 
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6">
        {/* Price Trend Chart */}
        {chartData && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg">
            <div className="h-[200px] sm:h-[250px]">
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        font: {
                          size: window.innerWidth < 640 ? 10 : 12
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      grid: { 
                        color: 'rgba(0, 0, 0, 0.1)',
                        display: false 
                      },
                      ticks: { 
                        color: '#6b7280',
                        font: {
                          size: window.innerWidth < 640 ? 10 : 12
                        }
                      }
                    },
                    x: {
                      grid: { 
                        color: 'rgba(0, 0, 0, 0.1)',
                        display: false 
                      },
                      ticks: { 
                        color: '#6b7280',
                        font: {
                          size: window.innerWidth < 640 ? 10 : 12
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Key Indicators */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
          <TrendIndicator 
            isUptrend={isUptrend} 
            sma50={data.technical.sma_50}
            sma200={data.technical.sma_200}
          />
          <MomentumIndicator 
            rsi={data.technical.rsi}
            isOversold={isOversold}
            isOverbought={isOverbought}
          />
        </div>

        {/* Support & Resistance */}
        <KeyLevels 
          current={data.technical.current_price}
          support={data.technical.support}
          resistance={data.technical.resistance}
        />

        {/* Pivot Points */}
        <PivotPoints 
          pivot={data.technical.pivot}
          support={data.technical.support}
          resistance={data.technical.resistance}
          current={data.technical.current_price}
        />
      </CardContent>
    </Card>
  );
};

// Sub-components
const LoadingSkeleton = () => (
  <Card className="border border-gray-200 dark:border-gray-700">
    <CardHeader>
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-[160px] sm:w-[200px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-[200px] sm:h-[250px] rounded-lg" />
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-24 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </CardContent>
  </Card>
);

const ErrorDisplay = ({ error }) => (
  <Card className="bg-gray-900 border-gray-800">
    <CardHeader>
      <CardTitle className="text-red-500">Technical Analysis Error</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-400">{error}</p>
    </CardContent>
  </Card>
);

const TimeframeSelector = ({ timeframe, onChange }) => (
  <div className="flex gap-2">
    {['1d', '1w', '1m'].map((tf) => (
      <Button 
        key={tf}
        variant={timeframe === tf ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange(tf)}
        className="text-xs"
      >
        {tf.toUpperCase()}
      </Button>
    ))}
  </div>
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#9ca3af',
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      titleColor: '#fff',
      bodyColor: '#d1d5db',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1
    }
  },
  scales: {
    y: {
      grid: { color: 'rgba(255, 255, 255, 0.1)' },
      ticks: { color: '#9ca3af' }
    },
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.1)' },
      ticks: { color: '#9ca3af' }
    }
  }
};

const TrendIndicator = ({ isUptrend, sma50, sma200 }) => (
  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CandlestickChart className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
        <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Trend</span>
      </div>
      <Badge 
        variant={isUptrend ? 'positive' : 'negative'}
        className="text-xs sm:text-sm"
      >
        {isUptrend ? 'Uptrend' : 'Downtrend'}
      </Badge>
    </div>
    <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-4">
      <div>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">SMA 50</p>
        <p className="text-base sm:text-lg font-bold">${sma50.toFixed(2)}</p>
      </div>
      <div>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">SMA 200</p>
        <p className="text-base sm:text-lg font-bold">${sma200.toFixed(2)}</p>
      </div>
    </div>
  </div>
);

const MomentumIndicator = ({ rsi, isOversold, isOverbought }) => (
  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
        <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Momentum</span>
      </div>
      <Badge 
        variant={
          isOversold ? 'positive' : 
          isOverbought ? 'negative' : 'neutral'
        }
        className="uppercase"
      >
        {isOversold ? 'Oversold' : isOverbought ? 'Overbought' : 'Neutral'}
      </Badge>
    </div>
    <div className="mt-2">
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">RSI (14)</p>
      <div className="flex items-center gap-2 sm:gap-4">
        <p className="text-base sm:text-lg font-bold">{rsi.toFixed(1)}</p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2.5 rounded-full ${
              isOversold ? 'bg-green-500' : 
              isOverbought ? 'bg-red-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${Math.min(Math.max(rsi, 0), 100)}%` }}
          />
        </div>
      </div>
    </div>
  </div>
);

const KeyLevels = ({ current, support, resistance }) => (
  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg">
    <h3 className="font-medium sm:font-semibold text-base sm:text-lg mb-2 sm:mb-3">Key Levels</h3>
    <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-4">
      <LevelIndicator 
        label="Current Price"
        value={current}
        type="current"
      />
      <LevelIndicator 
        label="Support"
        value={support}
        type="support"
      />
      <LevelIndicator 
        label="Resistance"
        value={resistance}
        type="resistance"
      />
    </div>
  </div>
);

const LevelIndicator = ({ label, value, type }) => {
  const icon = {
    current: <Gauge className="w-5 h-5 text-blue-500" />,
    support: <ArrowUp className="w-5 h-5 text-green-500" />,
    resistance: <ArrowDown className="w-5 h-5 text-red-500" />
  }[type];

  return (
    <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <p className="text-xl font-bold">${value.toFixed(2)}</p>
    </div>
  );
};

const PivotPoints = ({ pivot, support, resistance, current }) => (
  <div className="bg-gray-800/50 p-4 rounded-lg">
    <h3 className="font-semibold text-lg mb-3">Pivot Points</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <PivotPoint 
        label="Pivot"
        value={pivot}
        current={current}
      />
      <PivotPoint 
        label="S1"
        value={pivot - (resistance - pivot)}
        current={current}
      />
      <PivotPoint 
        label="R1"
        value={pivot + (pivot - support)}
        current={current}
      />
      <PivotPoint 
        label="S2"
        value={support - (pivot - support)}
        current={current}
      />
    </div>
  </div>
);

const PivotPoint = ({ label, value, current }) => {
  const difference = current - value;
  const isAbove = difference > 0;
  const percentageDiff = (Math.abs(difference) / current) * 100;

  return (
    <div className="p-3 bg-gray-700/50 rounded-lg">
      <div className="flex justify-between items-start">
        <span className="text-sm text-gray-400">{label}</span>
        <Badge 
          variant={isAbove ? 'positive' : 'negative'}
          className="text-xs"
        >
          {isAbove ? 'Above' : 'Below'} {percentageDiff.toFixed(1)}%
        </Badge>
      </div>
      <p className="text-lg font-bold mt-1">${value.toFixed(2)}</p>
    </div>
  );
};

// PropTypes
TrendIndicator.propTypes = {
  symbol: PropTypes.string.isRequired,
  isUptrend: PropTypes.bool.isRequired,
  sma50: PropTypes.number.isRequired,
  sma200: PropTypes.number.isRequired,
};

MomentumIndicator.propTypes = {
  rsi: PropTypes.number.isRequired,
  isOversold: PropTypes.bool.isRequired,
  isOverbought: PropTypes.bool.isRequired
};

TimeframeSelector.propTypes = {
  timeframe: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

KeyLevels.propTypes = {
  current: PropTypes.number.isRequired,
  support: PropTypes.number.isRequired,
  resistance: PropTypes.number.isRequired
};

PivotPoints.propTypes = {
  pivot: PropTypes.number.isRequired,
  support: PropTypes.number.isRequired,
  resistance: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired
};


LevelIndicator.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  type: PropTypes.oneOf(['current', 'support', 'resistance']).isRequired
};

PivotPoint.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired
};

ErrorDisplay.propTypes = {
  error: PropTypes.string.isRequired,
  symbol: PropTypes.string
};

export default TechnicalIndicatorsCard;