/**
 * Weekly performance chart. Plots only the real weekly buckets returned by
 * /performance/ (series). Weeks with no resolved predictions are skipped.
 */
import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const METRIC_LABEL = { f1: 'F1 score', accuracy: 'Accuracy', precision: 'Precision' };

const PerformanceChart = ({ data, metric = 'f1', isLoading }) => {
  const summary = data?.data ?? data;
  const series = Array.isArray(summary?.series) ? summary.series : [];
  const points = series.filter((p) => p.resolved > 0);

  const chartData = useMemo(() => ({
    labels: points.map((p) => p.week_start),
    datasets: [{
      label: METRIC_LABEL[metric] || 'F1 score',
      data: points.map((p) => p[metric] ?? null),
      borderColor: '#9CA3AF',
      backgroundColor: 'rgba(156, 163, 175, 0.1)',
      tension: 0.3,
      fill: true,
    }],
  }), [points, metric]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${METRIC_LABEL[metric]}: ${ctx.parsed.y}%` } },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: '#9CA3AF', callback: (v) => `${v}%` },
        grid: { color: 'rgba(55, 65, 81, 0.3)' },
      },
      x: { ticks: { color: '#9CA3AF' }, grid: { display: false } },
    },
  };

  if (isLoading) return <div className="h-64 rounded-lg bg-gray-800 animate-pulse" />;
  if (points.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No resolved predictions in the last 30 days yet, so there is nothing to chart.
      </p>
    );
  }
  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  );
};

PerformanceChart.propTypes = {
  data: PropTypes.object,
  metric: PropTypes.oneOf(['f1', 'accuracy', 'precision']),
  isLoading: PropTypes.bool,
};

export default PerformanceChart;
