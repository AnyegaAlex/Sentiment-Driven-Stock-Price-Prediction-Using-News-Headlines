import { useState } from "react";
import axios from "axios";
import PropTypes from "prop-types";

const PredictionForm = ({ apiEndpoint = "http://127.0.0.1:8000/api/stocks/predict/" }) => {
  const [formData, setFormData] = useState({
    openPrice: "",
    closePrice: "",
    volume: "",
    sentimentScore: "",
  });
  const [prediction, setPrediction] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    openPrice: false,
    closePrice: false,
    volume: false,
    sentimentScore: false,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setTouched({ ...touched, [name]: true });
  };

  const validateForm = () => {
    return (
      formData.openPrice &&
      formData.closePrice &&
      formData.volume &&
      formData.sentimentScore
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPrediction("");

    if (!validateForm()) {
      setError("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(apiEndpoint, {
        features: [
          parseFloat(formData.openPrice),
          parseFloat(formData.closePrice),
          parseInt(formData.volume),
          parseFloat(formData.sentimentScore),
        ],
      });

      if (!response.data?.prediction) {
        throw new Error("Invalid response from server");
      }

      setPrediction(response.data.prediction);
    } catch (err) {
      console.error("Prediction error:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch prediction. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const isFieldValid = (fieldName) => {
    return touched[fieldName] && !formData[fieldName];
  };

  return (
    <div className="p-6 rounded-xl bg-white dark:bg-gray-800 shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-100">
        Stock Movement Prediction
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {["openPrice", "closePrice", "volume", "sentimentScore"].map((field) => (
          <div key={field}>
            <label
              htmlFor={field}
              className="block font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {field.split(/(?=[A-Z])/).join(" ")}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id={field}
              name={field}
              value={formData[field]}
              onChange={handleInputChange}
              onBlur={() => setTouched({ ...touched, [field]: true })}
              className={`w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                isFieldValid(field) ? "border-red-500" : "border-gray-300"
              }`}
              required
              step={field === "sentimentScore" ? "0.01" : "any"}
              min={field === "sentimentScore" ? "-1" : "0"}
              max={field === "sentimentScore" ? "1" : undefined}
              aria-invalid={isFieldValid(field)}
              aria-describedby={isFieldValid(field) ? `${field}-error` : undefined}
            />
            {isFieldValid(field) && (
              <p id={`${field}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
                This field is required
              </p>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={loading || !validateForm()}
          className="w-full p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          aria-busy={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Predicting...
            </span>
          ) : (
            "Predict"
          )}
        </button>
      </form>

      {prediction && (
        <div
          role="status"
          className="mt-6 p-4 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200"
        >
          <strong className="font-medium">Prediction:</strong>{" "}
          <span className="capitalize">{prediction.toLowerCase()}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 p-4 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200"
        >
          <strong className="font-medium">Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

PredictionForm.propTypes = {
  apiEndpoint: PropTypes.string,
};

PredictionForm.defaultProps = {
  apiEndpoint: "http://127.0.0.1:8000/api/stocks/predict/",
};

export default PredictionForm;