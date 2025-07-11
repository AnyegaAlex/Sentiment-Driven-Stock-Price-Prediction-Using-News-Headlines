// src/services/mockTechnicalData.js
export const generateMockTechnicalData = (symbol = 'IBM', timeframe = '1d') => {
  // Base price with some randomness
  const basePrice = 100 + (Math.random() * 50 - 25);
  
  // Generate realistic technical indicators based on timeframe
  const timeframeMultiplier = {
    '1d': 1,
    '1w': 5,
    '1m': 20
  }[timeframe] || 1;

  const volatility = 0.02 * timeframeMultiplier;
  const rsi = 40 + Math.random() * 40; // RSI between 40-80
  const sma50 = basePrice * (0.98 + Math.random() * 0.04 * timeframeMultiplier);
  const sma200 = basePrice * (0.95 + Math.random() * 0.1 * timeframeMultiplier);
  
  // Support/resistance levels
  const support = basePrice * (0.95 - Math.random() * 0.02);
  const resistance = basePrice * (1.05 + Math.random() * 0.02);
  const pivot = (support + resistance + basePrice) / 3;

  return {
    technical: {
      current_price: basePrice,
      rsi,
      sma_50: sma50,
      sma_200: sma200,
      support,
      resistance,
      pivot,
      volume: Math.floor(1000000 + Math.random() * 5000000 * timeframeMultiplier),
      change_percent: (Math.random() * 5 - 2.5).toFixed(2),
      high: basePrice * (1 + volatility),
      low: basePrice * (1 - volatility),
      open: basePrice * (1 + (Math.random() * volatility * 2 - volatility))
    },
    last_updated: new Date().toISOString()
  };
};

export const fetchMockTechnicalData = async (symbol, timeframe) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(generateMockTechnicalData(symbol, timeframe));
    }, 500); // Simulate network delay
  });
};