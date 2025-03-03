import axios from 'axios';

// Retrieve the Alpha Vantage API key from Vite environment variables.
const ALPHA_VANTAGE_API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY;

/**
 * Searches stocks using the Alpha Vantage SYMBOL_SEARCH API.
 * @param {string} keywords - The search query.
 * @returns {Promise<Array>} An array of stock objects.
 */
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

    // Map the API response to a more usable format.
    return response.data.bestMatches?.map((stock) => ({
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
