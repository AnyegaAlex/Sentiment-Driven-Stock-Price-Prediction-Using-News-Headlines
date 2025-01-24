import { api } from "./api";

export const fetchStocks = async (symbol) => {
  try {
    const response = await api.get(`/stocks/${symbol}/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching stocks:", error);
    throw error;
  }
};
