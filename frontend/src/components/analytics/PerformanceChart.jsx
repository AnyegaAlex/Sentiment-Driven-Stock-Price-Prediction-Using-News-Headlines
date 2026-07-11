import { Bar } from 'react-chartjs-2';
import PropTypes from 'prop-types';
import { useMemo, useRef, useEffect, useState } from 'react';
import { 
  Chart as ChartJS, 
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
  Filler
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

ChartJS.register(
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
  Filler,
  annotationPlugin
);

const CHART_COLORS = {
  accuracy: {
    bg: 'rgba(59, 130, 246, 0.5)',
    border: 'rgb(59, 130, 246)',
    hover: 'rgba(59, 130, 246, 0.7)'
  },
  f1Score: {
    line: 'rgb(239, 68, 68)',
    point: 'rgb(239, 68, 68)',
    hover: 'rgb(220, 38, 38)'
  },
  threshold: {
    line: 'rgb(234, 179, 8)',
    label: 'rgb(234, 179, 8)'
  },
  grid: {
    line: 'rgba(75, 85, 99, 0.2)',
    text: 'rgb(156, 163, 175)'
  }
};

export const PerformanceChart = ({ 
  data = [], 
  title = 'Model Performance',
  threshold = 0.75,
  className,
  height,
  showThreshold = true,
  isLoading = false,
  error = null,
  onRetry,
  ariaLabel = 'Model performance chart showing accuracy and F1 score over time'
}) => {
  // Responsive height: 300px on mobile, 400px on larger screens
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const defaultHeight = windowWidth < 640 ? 250 : windowWidth < 1024 ? 300 : 400;
  const chartHeight = height || defaultHeight;

  const chartContainerRef = useRef(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
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

  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return null;
    const validData = data.filter(d => 
      d && 
      typeof d.timestamp === 'string' && 
      typeof d.accuracy === 'number' && 
      typeof d.f1_score === 'number' &&
      !isNaN(d.accuracy) && 
      !isNaN(d.f1_score)
    );
    if (validData.length === 0) return null;
    return {
      labels: validData.map(d => {
        try {
          return new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch { return 'Invalid Date'; }
      }),
      datasets: [
        {
          label: 'Accuracy',
          data: validData.map(d => Math.min(1, Math.max(0, d.accuracy))),
          backgroundColor: CHART_COLORS.accuracy.bg,
          borderColor: CHART_COLORS.accuracy.border,
          borderWidth: 1,
          hoverBackgroundColor: CHART_COLORS.accuracy.hover,
          yAxisID: 'y',
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.8,
        },
        {
          label: 'F1 Score',
          data: validData.map(d => Math.min(1, Math.max(0, d.f1_score))),
          borderColor: CHART_COLORS.f1Score.line,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointBackgroundColor: CHART_COLORS.f1Score.point,
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointRadius: chartDimensions.width < 640 ? 2 : 3,
          pointHoverRadius: chartDimensions.width < 640 ? 4 : 5,
          type: 'line',
          yAxisID: 'y1',
          tension: 0.1,
          fill: false,
        }
      ]
    };
  }, [data, chartDimensions.width]);

  const chartOptions = useMemo(() => {
    const isMobile = chartDimensions.width < 640;
    const isTablet = chartDimensions.width >= 640 && chartDimensions.width < 1024;

    const annotations = {};
    if (showThreshold && threshold >= 0 && threshold <= 1) {
      annotations.threshold = {
        type: 'line',
        yMin: threshold,
        yMax: threshold,
        borderColor: CHART_COLORS.threshold.line,
        borderWidth: isMobile ? 1.5 : 2,
        borderDash: [5, 5],
        label: {
          content: `Target: ${(threshold * 100).toFixed(0)}%`,
          display: true,
          position: 'end',
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          color: CHART_COLORS.threshold.label,
          font: {
            size: isMobile ? 9 : 11,
            weight: '500'
          },
          padding: isMobile ? 2 : 4
        }
      };
    }

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'center',
          labels: {
            color: CHART_COLORS.grid.text,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            boxHeight: 8,
            padding: isMobile ? 10 : 15,
            font: {
              size: isMobile ? 10 : 12,
              weight: '500'
            }
          }
        },
        title: {
          display: !!title,
          text: title,
          color: 'rgb(243, 244, 246)',
          font: {
            size: isMobile ? 14 : 16,
            weight: '600'
          },
          padding: {
            bottom: isMobile ? 15 : 20
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: 'rgb(243, 244, 246)',
          bodyColor: 'rgb(209, 213, 219)',
          borderColor: 'rgba(75, 85, 99, 0.5)',
          borderWidth: 1,
          padding: isMobile ? 6 : 8,
          titleFont: { size: isMobile ? 11 : 12 },
          bodyFont: { size: isMobile ? 10 : 11 },
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.raw;
              return `${label}: ${(value * 100).toFixed(1)}%`;
            }
          }
        },
        annotation: annotations
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: true, color: CHART_COLORS.grid.line },
          ticks: {
            color: CHART_COLORS.grid.text,
            font: { size: isMobile ? 9 : 11 },
            maxRotation: isMobile ? 45 : 30,
            minRotation: isMobile ? 45 : 30,
            maxTicksLimit: isMobile ? 5 : isTablet ? 8 : 12
          }
        },
        y: {
          position: 'left',
          title: {
            display: !isMobile,
            text: 'Accuracy',
            color: CHART_COLORS.grid.text,
            font: { size: 11 }
          },
          min: 0,
          max: 1,
          grid: { color: CHART_COLORS.grid.line, drawBorder: true },
          ticks: {
            color: CHART_COLORS.grid.text,
            font: { size: isMobile ? 9 : 11 },
            callback: (value) => `${(value * 100).toFixed(0)}%`,
            stepSize: 0.2
          }
        },
        y1: {
          position: 'right',
          title: {
            display: !isMobile,
            text: 'F1 Score',
            color: CHART_COLORS.grid.text,
            font: { size: 11 }
          },
          min: 0,
          max: 1,
          grid: { drawOnChartArea: false, color: CHART_COLORS.grid.line },
          ticks: {
            color: CHART_COLORS.grid.text,
            font: { size: isMobile ? 9 : 11 },
            callback: (value) => `${(value * 100).toFixed(0)}%`,
            stepSize: 0.2
          }
        }
      }
    };
  }, [chartDimensions.width, title, threshold, showThreshold]);

  if (isLoading) {
    return (
      <div className={cn("w-full", className)} style={{ height: typeof chartHeight === 'number' ? `${chartHeight}px` : chartHeight }}>
        <SkeletonChart height={chartHeight} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("w-full", className)} style={{ height: typeof chartHeight === 'number' ? `${chartHeight}px` : chartHeight }}>
        <ChartError error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className={cn("w-full flex items-center justify-center bg-gray-800/30 border border-gray-700/50 rounded-lg", className)} 
           style={{ height: typeof chartHeight === 'number' ? `${chartHeight}px` : chartHeight }}>
        <p className="text-gray-400 text-sm">No performance data available</p>
      </div>
    );
  }

  return (
    <div
      ref={chartContainerRef}
      className={cn("w-full relative", className)}
      style={{ height: typeof chartHeight === 'number' ? `${chartHeight}px` : chartHeight }}
      role="img"
      aria-label={ariaLabel}
    >
      <Bar 
        key={`${chartDimensions.width}-${data.length}`}
        data={chartData} 
        options={chartOptions} 
      />
    </div>
  );
};

const SkeletonChart = ({ height }) => (
  <div className="space-y-3 w-full">
    <Skeleton className="h-6 w-48 bg-gray-800" />
    <div className="flex gap-4">
      <Skeleton className="h-4 w-20 bg-gray-800" />
      <Skeleton className="h-4 w-20 bg-gray-800" />
    </div>
    <div className="w-full bg-gray-800/30 rounded-lg p-4" style={{ height: typeof height === 'number' ? height - 80 : height }}>
      <div className="w-full h-full flex items-end gap-2">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="flex-1 bg-gray-800 rounded-t-lg" style={{ height: `${Math.random() * 60 + 20}%`, minWidth: '30px' }} />
        ))}
      </div>
    </div>
  </div>
);

const ChartError = ({ error, onRetry }) => (
  <Alert variant="destructive" className="h-full border-rose-500/30 bg-rose-500/10">
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <AlertCircle className="h-8 w-8 text-rose-400 mb-2" />
      <AlertTitle className="text-rose-300 font-semibold mb-1">Failed to load chart</AlertTitle>
      <AlertDescription className="text-rose-200/80 text-sm mb-3">{error}</AlertDescription>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 min-h-[44px]">
          Retry
        </Button>
      )}
    </div>
  </Alert>
);

PerformanceChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.string.isRequired,
      accuracy: PropTypes.number.isRequired,
      f1_score: PropTypes.number.isRequired
    })
  ),
  title: PropTypes.string,
  threshold: PropTypes.number,
  className: PropTypes.string,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  showThreshold: PropTypes.bool,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func,
  ariaLabel: PropTypes.string
};

export default PerformanceChart;