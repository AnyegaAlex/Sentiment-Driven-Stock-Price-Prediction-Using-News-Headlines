import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from 'chart.js';
import { 
  AlertTriangle, 
  Smile, 
  Meh, 
  Frown,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fetchMockSentimentData } from '@/services/mockSentimentData';
// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SentimentAnalysisCard = ({ symbol }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try real API first, fall back to mock data
        let response;
        try {
          response = await axios.get(`/api/sentiment-analysis`, {
            params: { 
              symbol,
              time_range: timeRange 
            },
            timeout: 10000
          });
          
          if (!response.data?.sentiment) {
            throw new Error('Invalid API response structure');
          }
          
          setData(response.data);
        } catch (apiError) {
          console.warn("Using mock data due to API error:", apiError);
          const mockData = await fetchMockSentimentData(symbol, timeRange);
          setData(mockData);
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch sentiment data');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, timeRange]);

  const { sentimentScore, isBullish, isBearish, sentimentDistribution } = useMemo(() => {
    if (!data) return {};
    
    const score = ((data.sentiment + 1) / 2) * 100;
    return {
      sentimentScore: score,
      isBullish: score >= 60,
      isBearish: score <= 40,
      sentimentDistribution: {
        positive: Math.round(score),
        neutral: Math.abs(score - 50) * 2,
        negative: 100 - Math.round(score)
      }
    };
  }, [data]);

  const historicalData = useMemo(() => ({
    labels: ['6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Yesterday', 'Today'],
    datasets: [{
      label: 'Sentiment Score',
      data: [45, 52, 60, 58, 65, 70, sentimentScore || 50],
      borderColor: isBullish ? '#22c55e' : isBearish ? '#ef4444' : '#eab308',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.4,
      fill: true
    }]
  }), [sentimentScore, isBullish, isBearish]);

  const distributionData = useMemo(() => ({
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [{
      label: 'Sentiment Distribution',
      data: [
        sentimentDistribution?.positive || 0,
        sentimentDistribution?.neutral || 0,
        sentimentDistribution?.negative || 0
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.7)',
        'rgba(234, 179, 8, 0.7)',
        'rgba(239, 68, 68, 0.7)'
      ],
      borderColor: [
        'rgba(34, 197, 94, 1)',
        'rgba(234, 179, 8, 1)',
        'rgba(239, 68, 68, 1)'
      ],
      borderWidth: 1
    }]
  }), [sentimentDistribution]);

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
    <Card className="border border-gray-900 dark:border-gray-700 rounded-lg shadow-sm ">
      <CardHeader>
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
          <CardTitle className="text-lg sm:text-xl font-semibold">
            Market Sentiment Analysis
          </CardTitle>
          <TimeRangeSelector 
            timeRange={timeRange} 
            onChange={setTimeRange} 
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6">
        <SentimentSummary 
          distribution={sentimentDistribution} 
        />

        <SentimentTrendChart 
          data={historicalData} 
          isBullish={isBullish}
          isBearish={isBearish}
        />

        <SentimentDistributionChart 
          data={distributionData} 
        />

        <NewsSourceAnalysis 
          newsCount={data.news_count}
          sourceStats={data.source_stats}
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
        <Skeleton className="h-8 w-[80px]" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[200px] sm:h-[250px] rounded-lg" />
      <Skeleton className="h-[200px] sm:h-[250px] rounded-lg" />
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </CardContent>
  </Card>
);

const ErrorDisplay = ({ error }) => (
  <Card className="border border-red-200 dark:border-red-800/50">
    <CardHeader>
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <AlertTriangle className="w-5 h-5" />
        <CardTitle className="text-base sm:text-lg">
          Error Loading Sentiment
        </CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
        {error}
      </p>
      <Button 
        variant="outline" 
        size="sm"
        className="mt-3"
        onClick={() => window.location.reload()}
      >
        Retry
      </Button>
    </CardContent>
  </Card>
);

const TimeRangeSelector = ({ timeRange, onChange }) => (
  <div className="flex gap-1 sm:gap-2" role="radiogroup" aria-label="Select Time Range">
    {['7d', '30d'].map((range) => (
      <Button 
        key={range}
        variant={timeRange === range ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange(range)}
        aria-pressed={timeRange === range}
        aria-label={`Set time range to ${range}`}
        className="text-xs px-2 sm:px-3 py-1 h-auto"
      >
        {range.toUpperCase()}
      </Button>
    ))}
  </div>
);


const SentimentSummary = ({ distribution }) => (
  <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-4">
    <SentimentMetric 
      icon={<Smile className="w-5 h-5 text-green-500" />}
      label="Positive"
      value={distribution.positive}
      trend="+2.5% (7d)"
      variant="positive"
    />
    <SentimentMetric 
      icon={<Meh className="w-5 h-5 text-yellow-500" />}
      label="Neutral"
      value={distribution.neutral}
      trend="+1.2% (7d)"
      variant="neutral"
    />
    <SentimentMetric 
      icon={<Frown className="w-5 h-5 text-red-500" />}
      label="Negative"
      value={distribution.negative}
      trend="-3.7% (7d)"
      variant="negative"
    />
  </div>
);

const SentimentMetric = ({ icon, label, value, trend, variant }) => {
  const trendIcon = variant === 'negative' ? 
    <TrendingDown className="w-4 h-4 text-red-500" /> : 
    <TrendingUp className="w-4 h-4" />;
  
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 p-2 sm:p-3 rounded-lg">
      <div className="flex items-center gap-1 sm:gap-2 text-gray-600 dark:text-gray-400">
        {React.cloneElement(icon, { className: "w-4 h-4 sm:w-5 sm:h-5" })}
        <span className="text-xs sm:text-sm">{label}</span>
      </div>
      <p className={cn(
        "text-xl sm:text-2xl font-bold mt-1 sm:mt-2",
        variant === 'positive' ? 'text-green-600 dark:text-green-400' :
        variant === 'negative' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
      )}>
        {value}%
      </p>
      <div className="flex items-center gap-1 mt-1">
        {trendIcon}
        <Badge variant={variant} className="text-xs">
          {trend}
        </Badge>
      </div>
    </div>
  );
};

const SentimentTrendChart = ({ data, isBullish, isBearish }) => (
  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg">
    <h3 className="font-medium sm:font-semibold text-base sm:text-lg mb-3 sm:mb-4">Sentiment Trend</h3>
    <div className="h-[200px] sm:h-[250px]">
      <Line 
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
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
              min: 0,
              max: 100,
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              ticks: { color: '#9ca3af' }
            },
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              ticks: { color: '#9ca3af' }
            }
          }
        }}
      />
    </div>
  </div>
);

const SentimentDistributionChart = ({ data }) => (
  <div className="bg-gray-800/50 p-4 rounded-lg">
    <h3 className="font-semibold text-lg mb-4">Sentiment Distribution</h3>
    <div className="h-64">
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
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
              beginAtZero: true,
              max: 100,
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              ticks: { color: '#9ca3af' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#9ca3af' }
            }
          }
        }}
      />
    </div>
  </div>
);

const NewsSourceAnalysis = ({ newsCount, sourceStats }) => (
  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg">
    <h3 className="font-medium sm:font-semibold text-base sm:text-lg mb-3 sm:mb-4">News Source Analysis</h3>
    <div className="grid grid-cols-2 gap-2 sm:gap-4">
      <SourceMetric 
        label="Total Articles"
        value={newsCount}
      />
      <SourceMetric 
        label="Tier 1 Sources"
        value={sourceStats?.tier1_count || 0}
      />
      <SourceMetric 
        label="Avg Reliability"
        value={`${Math.round(
          (sourceStats?.reliability_sum || 0) / (newsCount || 1)
        )}%`}
      />
      <SourceMetric 
        label="Top Source"
        value={sourceStats?.tier1_sources?.[0] || 'N/A'}
      />
    </div>
  </div>
);

const SourceMetric = ({ label, value }) => (
  <div className="bg-gray-700/50 p-3 rounded">
    <p className="text-sm text-gray-400">{label}</p>
    <p className="text-xl font-bold">{value}</p>
  </div>
);

// PropTypes
ErrorDisplay.propTypes = {
  error: PropTypes.string.isRequired
};
TimeRangeSelector.propTypes = {
  timeRange: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};
SentimentSummary.propTypes = {
  distribution: PropTypes.shape({
    positive: PropTypes.number,
    neutral: PropTypes.number,
    negative: PropTypes.number
  }).isRequired
};SentimentTrendChart.propTypes = {
  data: PropTypes.object.isRequired,
  isBullish: PropTypes.bool,
  isBearish: PropTypes.bool
};
SentimentDistributionChart.propTypes = {
  data: PropTypes.object.isRequired
};
NewsSourceAnalysis.propTypes = {
  newsCount: PropTypes.number.isRequired,
  sourceStats: PropTypes.shape({
    tier1_count: PropTypes.number,
    reliability_sum: PropTypes.number,
    tier1_sources: PropTypes.arrayOf(PropTypes.string)
  })
};

SentimentAnalysisCard.propTypes = {
  symbol: PropTypes.string.isRequired
};

SentimentMetric.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  trend: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['positive', 'neutral', 'negative']).isRequired
};

SourceMetric.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]).isRequired
};

export default SentimentAnalysisCard;