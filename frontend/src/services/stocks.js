import api from "./api";

export const fetchStockData = async (symbol) => {
  try {
    // Use the api instance with the configured base URL.
    const response = await api.get(`/stocks/${symbol}/`);
    return {
      historical: response.data.historical,
      news: response.data.news,
      prediction: response.data.prediction,
    };
  } catch (error) {
    console.error("Error fetching stock data:", error);
    return null;
  }
};
