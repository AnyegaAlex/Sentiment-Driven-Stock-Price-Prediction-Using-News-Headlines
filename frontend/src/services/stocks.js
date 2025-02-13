export const fetchStockData = async (symbol) => {
  try {
    const response = await axios.get(`/api/stocks/${symbol}/`);
    return {
      historical: response.data.historical,
      news: response.data.news,
      prediction: response.data.prediction
    };
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return null;
  }
};