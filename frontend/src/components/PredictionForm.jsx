import { useState } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="p-4 sm:p-6 rounded-xl border border-gray-800 bg-gray-900 max-w-md sm:max-w-lg mx-auto w-full">
      <h2 className="text-xl font-bold mb-6 text-white">
        Stock Movement Prediction
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {["openPrice", "closePrice", "volume", "sentimentScore"].map((field) => (
          <div key={field}>
            <label
              htmlFor={field}
              className="block font-medium text-gray-300 mb-1"
            >
              {field.split(/(?=[A-Z])/).join(" ")}
              <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              id={field}
              name={field}
              value={formData[field]}
              onChange={handleInputChange}
              onBlur={() => setTouched({ ...touched, [field]: true })}
              className={cn(
                "w-full min-h-[44px] p-3 border rounded-md bg-gray-900 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-black",
                isFieldValid(field) ? "border-red-400" : "border-gray-800"
              )}
              required
              step={field === "sentimentScore" ? "0.01" : "any"}
              min={field === "sentimentScore" ? "-1" : "0"}
              max={field === "sentimentScore" ? "1" : undefined}
              aria-invalid={isFieldValid(field)}
              aria-describedby={isFieldValid(field) ? `${field}-error` : undefined}
            />
            {isFieldValid(field) && (
              <p id={`${field}-error`} className="mt-1 text-sm text-red-400">
                This field is required
              </p>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={loading || !validateForm()}
          className="w-full min-h-[44px] p-3 bg-white text-black rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-busy={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
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
          className="mt-6 p-4 rounded-lg border border-green-400 bg-green-400/10 text-green-400"
        >
          <strong className="font-medium">Prediction:</strong>{" "}
          <span className="capitalize">{prediction.toLowerCase()}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 p-4 rounded-lg border border-red-400 bg-red-400/10 text-red-400"
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