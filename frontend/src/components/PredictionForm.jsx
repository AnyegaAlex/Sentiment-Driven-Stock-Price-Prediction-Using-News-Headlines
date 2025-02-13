import { useState } from "react";
import axios from "axios";

const PredictionForm = () => {
  const [formData, setFormData] = useState({
    openPrice: "",
    closePrice: "",
    volume: "",
    sentimentScore: "",
  });
  const [prediction, setPrediction] = useState("");
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPrediction("");

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/stocks/predict/",
        {
          features: [
            parseFloat(formData.openPrice),
            parseFloat(formData.closePrice),
            parseInt(formData.volume),
            parseFloat(formData.sentimentScore),
          ],
        }
      );
      setPrediction(response.data.prediction);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch prediction. Please try again.");
    }
  };

  return (
    <div className="p-4 rounded-xl bg-white shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Stock Movement Prediction</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="openPrice" className="block font-medium">
            Open Price
          </label>
          <input
            type="number"
            id="openPrice"
            name="openPrice"
            value={formData.openPrice}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="closePrice" className="block font-medium">
            Close Price
          </label>
          <input
            type="number"
            id="closePrice"
            name="closePrice"
            value={formData.closePrice}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="volume" className="block font-medium">
            Volume
          </label>
          <input
            type="number"
            id="volume"
            name="volume"
            value={formData.volume}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="sentimentScore" className="block font-medium">
            Sentiment Score
          </label>
          <input
            type="number"
            step="0.01"
            id="sentimentScore"
            name="sentimentScore"
            value={formData.sentimentScore}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Predict
        </button>
      </form>

      {prediction && (
        <div className="mt-4 p-3 rounded-lg bg-green-100 text-green-700">
          <strong>Prediction:</strong> {prediction.toUpperCase()}
        </div>
      )}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default PredictionForm;
