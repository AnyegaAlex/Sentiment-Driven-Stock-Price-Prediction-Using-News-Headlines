import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Progress 
} from '@/components/ui/card';
import { 
  FaArrowUp, 
  FaArrowDown, 
  FaRegCircle,
  FaExternalLinkAlt
} from 'react-icons/fa';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle } from '@/components/ui/alert';

// Register Chart.js components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

const PredictionHistory = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch prediction data with error handling
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/stocks/history/');
        if (res.data && Array.isArray(res.data)) {
          setPredictions(res.data);
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (error) {
        console.error('Error fetching prediction data:', error);
        setError(error.response?.data?.message || 'Failed to load prediction history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Chart data configuration
  const chartData = {
    labels: predictions.map(pred => new Date(pred.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Confidence Score',
        data: predictions.map(pred => pred.confidence * 100),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Sentiment Score',
        data: predictions.map(pred => pred.sentiment_score * 100),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      }
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      title: { 
        display: true, 
        text: 'Prediction Metrics Over Time',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw.toFixed(2)}%`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Score (%)'
        }
      }
    }
  };

  // Render loading skeletons
  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full mt-2" />
                </div>
                <div>
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full mt-2" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Predictions</AlertTitle>
          <p>{error}</p>
        </Alert>
      </div>
    );
  }

  // Render empty state
  if (!loading && predictions.length === 0) {
    return (
      <div className="p-4">
        <Alert>
          <AlertTitle>No Prediction History Available</AlertTitle>
          <p>Your prediction history will appear here after making predictions.</p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 dark:bg-gray-900 min-h-screen">
      <h2 className="text-2xl font-semibold mb-6 dark:text-white">Prediction History</h2>

      {/* Prediction History Chart */}
      <div className="mb-8 p-4 bg-white rounded-lg shadow dark:bg-gray-800">
        <Bar 
          data={chartData} 
          options={chartOptions} 
          height={400}
        />
      </div>

      {/* Prediction Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {predictions.map((prediction, index) => (
          <Card key={index} className="shadow-lg border rounded-lg dark:border-gray-700 dark:bg-gray-800">
            <CardHeader className="p-4 border-b dark:border-gray-700">
              <h3 className="font-semibold dark:text-white">
                {prediction.headline.length > 50 
                  ? `${prediction.headline.slice(0, 50)}...` 
                  : prediction.headline}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(prediction.date).toLocaleDateString()} | {prediction.stock_symbol}
              </p>
            </CardHeader>

            <CardBody className="p-4 space-y-4">
              {/* Movement Indicator */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  {prediction.predicted_movement === 'up' ? (
                    <FaArrowUp className="text-green-500 dark:text-green-400" />
                  ) : prediction.predicted_movement === 'down' ? (
                    <FaArrowDown className="text-red-500 dark:text-red-400" />
                  ) : (
                    <FaRegCircle className="text-gray-500 dark:text-gray-400" />
                  )}
                  <span className="ml-2 font-medium dark:text-white">
                    {prediction.predicted_movement.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Sentiment Score */}
              <div>
                <div className="flex justify-between text-sm font-medium dark:text-white">
                  <span>Sentiment Score</span>
                  <span>{prediction.sentiment_score.toFixed(2)}</span>
                </div>
                <Progress 
                  value={Math.abs(prediction.sentiment_score) * 100} 
                  className="mt-2 h-2"
                  indicatorColor={
                    prediction.sentiment_score >= 0 
                      ? 'bg-green-500 dark:bg-green-400' 
                      : 'bg-red-500 dark:bg-red-400'
                  }
                />
              </div>

              {/* Confidence Level */}
              <div>
                <div className="flex justify-between text-sm font-medium dark:text-white">
                  <span>Confidence</span>
                  <span>{prediction.confidence.toFixed(2)}</span>
                </div>
                <Progress 
                  value={prediction.confidence * 100} 
                  className="mt-2 h-2"
                  indicatorColor="bg-blue-500 dark:bg-blue-400"
                />
              </div>
            </CardBody>

            <CardFooter className="p-4 border-t dark:border-gray-700">
              <button
                className="text-blue-500 dark:text-blue-400 font-medium flex items-center hover:underline"
                onClick={() => alert(`Full prediction details for ${prediction.date}`)}
              >
                View Details <FaExternalLinkAlt className="ml-2 w-3 h-3" />
              </button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PredictionHistory;