import { useState } from "react";
import axios from "axios";

export const useStockOpinion = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateOpinion = async (symbol, riskType, holdTime) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("/api/stock/opinion/", {
        symbol,
        risk_type: riskType,
        hold_time: holdTime,
      });

      console.log("Generated Opinion:", response.data);
      // Dispatch this data to context/store if needed for the other cards
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate opinion.");
    } finally {
      setLoading(false);
    }
  };

  return { generateOpinion, loading, error };
};
