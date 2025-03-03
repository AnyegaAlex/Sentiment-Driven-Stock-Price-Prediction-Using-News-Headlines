import React, { useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReactModal from "react-modal";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { FaDownload } from "react-icons/fa";

// Register Chart.js components
ChartJS.register(BarElement, CategoryScale, LinearScale, Title, ChartTooltip, Legend);

const PredictionHistory = () => {
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch prediction history using the object form of useQuery
  const { data, error, isLoading } = useQuery({
    queryKey: ["predictions"],
    queryFn: async () => {
      const res = await api.get("/stocks/prediction-history/");
      return res.data; // Expected: array of records with fields: date, predicted, actual, sentiment, etc.
    },
  });

  // Prepare dual-axis chart data:
  // - Bar dataset for predicted movement (1 for "up", 0 for "down")
  // - Line dataset for sentiment score (range: -1 to 1)
  const chartData = {
    labels: data ? data.map((d) => d.date) : [],
    datasets: [
      {
        label: "Predicted Movement",
        data: data ? data.map((d) => (d.predicted.toLowerCase() === "up" ? 1 : 0)) : [],
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        type: "bar",
        yAxisID: "y",
      },
      {
        label: "Sentiment Score",
        data: data ? data.map((d) => d.sentiment) : [],
        borderColor: "rgba(153, 102, 255, 1)",
        borderWidth: 2,
        fill: false,
        type: "line",
        yAxisID: "y1",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: "linear",
        position: "left",
        title: { display: true, text: "Predicted Movement (1=Up, 0=Down)" },
        ticks: {
          callback: (value) => (value === 1 ? "Up" : "Down"),
          stepSize: 1,
        },
      },
      y1: {
        type: "linear",
        position: "right",
        title: { display: true, text: "Sentiment Score" },
        grid: { drawOnChartArea: false },
        min: -1,
        max: 1,
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || "";
            return `${label}: ${context.raw}`;
          },
        },
      },
      legend: { display: true, position: "top" },
      title: { display: true, text: "Prediction History: Movement and Sentiment" },
    },
  };

  if (isLoading) return <div>Loading predictions...</div>;
  if (error) return <div>Error loading predictions</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Title Section */}
      <h1 className="text-3xl font-bold mb-4">Prediction History</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Prediction vs. Sentiment Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end mt-4">
        <Button onClick={() => setModalOpen(true)} aria-label="View detailed analysis">
          View Detailed Analysis
        </Button>
      </div>
      <ReactModal
        isOpen={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        contentLabel="Detailed Prediction Analysis"
        className="bg-white p-6 rounded-lg shadow-lg max-w-3xl mx-auto mt-10"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      >
        <h2 className="text-2xl font-bold mb-4">Detailed Prediction Analysis</h2>
        <p className="mb-4">
          Model Accuracy: 80% <br />
          F1-Score: 0.75 <br />
          Economic Value: Sharpe Ratio 1.1 <br />
          (Click on data points for more details.)
        </p>
        <Button onClick={() => setModalOpen(false)}>Close</Button>
      </ReactModal>
      <div className="flex justify-end mt-4">
        <Button
          variant="default"
          onClick={() => console.log("Download Report")}
          aria-label="Download full report"
          className="flex items-center gap-2"
        >
          <FaDownload className="mr-2" />
          Download Full Report
        </Button>
      </div>
    </div>
  );
};

export default PredictionHistory;
