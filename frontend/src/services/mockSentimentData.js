// src/services/mockSentimentData.js
export const generateMockSentimentData = (symbol = 'IBM', timeRange = '7d') => {
  // Base sentiment with some randomness
  const baseSentiment = 0.5 + (Math.random() * 0.4 - 0.2); // Between 0.3-0.7
  
  // Adjust for time range
  const days = timeRange === '7d' ? 7 : 30;
  const volatility = timeRange === '7d' ? 0.1 : 0.05;
  
  // Generate historical data
  const historicalSentiment = Array.from({ length: days }, (_, i) => {
    const dayOffset = days - i - 1;
    return baseSentiment + (Math.random() * volatility * 2 - volatility) - (0.01 * dayOffset);
  });

  // Generate source statistics
  const sources = ['Bloomberg', 'Reuters', 'CNBC', 'WSJ', 'Financial Times'];
  const tier1Sources = sources.slice(0, 3);
  
  return {
    symbol,
    sentiment: baseSentiment,
    news_count: days * (3 + Math.floor(Math.random() * 5)),
    source_stats: {
      tier1_count: Math.floor(days * 2.5),
      reliability_sum: Math.floor(days * 2.5 * 85 + Math.random() * 500),
      tier1_sources: tier1Sources,
      total_sources: sources
    },
    historical_sentiment: historicalSentiment.map((s, i) => ({
      date: new Date(Date.now() - (days - i - 1) * 86400000).toISOString(),
      value: s
    })),
    last_updated: new Date().toISOString()
  };
};

export const fetchMockSentimentData = async (symbol, timeRange) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(generateMockSentimentData(symbol, timeRange));
    }, 500); // Simulate network delay
  });
};