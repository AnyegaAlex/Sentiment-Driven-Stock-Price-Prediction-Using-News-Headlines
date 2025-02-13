import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const PredictionHistory = () => {
  const chartData = {
    labels: ["May", "June", "July", "Aug", "Sep"],
    datasets: [
      {
        label: "Prediction Accuracy (%)",
        data: [95, 87, 92, 85, 90],
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };

  const predictions = [
    { date: "2023-05-01", predicted: "Up", actual: "Up", accuracy: "100%", reason: "#" },
    { date: "2023-06-01", predicted: "Down", actual: "Up", accuracy: "50%", reason: "#" },
    { date: "2023-07-01", predicted: "Up", actual: "Up", accuracy: "100%", reason: "#" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Prediction History</h1>
      <p className="text-gray-600 mb-6">Track the accuracy of our predictions over time.</p>

      <div className="bg-white shadow-md p-4 rounded-lg mb-6">
        <Bar data={chartData} />
      </div>

      <div className="bg-white shadow-md p-4 rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2">Date</th>
              <th className="p-2">Predicted</th>
              <th className="p-2">Actual</th>
              <th className="p-2">Accuracy</th>
              <th className="p-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((pred, index) => (
              <tr key={index} className="border-t">
                <td className="p-2">{pred.date}</td>
                <td className="p-2">{pred.predicted}</td>
                <td className="p-2">{pred.actual}</td>
                <td className="p-2">{pred.accuracy}</td>
                <td className="p-2">
                  <a href={pred.reason} className="text-blue-500">View Reason</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-4">
        <button className="px-4 py-2 bg-blue-500 text-white rounded">Download Full Report</button>
      </div>
    </div>
  );
};

export default PredictionHistory;
