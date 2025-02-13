import axios from 'axios';

const ALPHA_VANTAGE_API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY;

export const searchStocks = async (keywords) => {
  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'SYMBOL_SEARCH',
        keywords,
        apikey: ALPHA_VANTAGE_API_KEY,
      },
      timeout: 5000,
    });

    return response.data.bestMatches?.map(stock => ({
      symbol: stock['1. symbol'],
      name: stock['2. name'],
      type: stock['3. type'],
      region: stock['4. region'],
    })) || [];
  } catch (error) {
    console.error('Error searching stocks:', error);
    return [];
  }
};
