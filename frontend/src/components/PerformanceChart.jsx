import React from 'react';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const PerformanceChart = ({ data }) => {
  if (!data || !data.overall) return null;

  // Simulate historical F1 data (in real app, this would come from snapshots)
  const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const f1Values = [68, 72, 70, 74]; // Example

  const chartData = {
    labels,
    datasets: [
      {
        label: 'F1 Score (%)',
        data: f1Values,
        borderColor: '#9CA3AF', // gray-400
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => `F1: ${context.parsed.y}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: '#9CA3AF',
          callback: (value) => `${value}%`,
        },
        grid: {
          color: 'rgba(55, 65, 81, 0.3)',
        },
      },
      x: {
        ticks: {
          color: '#9CA3AF',
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <Card className="bg-gray-900 border border-gray-800">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-400">
          F1 Score Trend (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]" role="img" aria-label="F1 Score trend chart showing performance over 4 weeks">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceChart;