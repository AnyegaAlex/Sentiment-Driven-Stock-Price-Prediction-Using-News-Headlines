export const queryKeys = {
    stockOpinion: (symbol, risk, hold) => ['stockOpinion', symbol, risk, hold],
    technicalIndicators: (symbol, timeframe) => ['technicalIndicators', symbol, timeframe],
    sentimentAnalysis: (symbol, timeRange) => ['sentimentAnalysis', symbol, timeRange],
    news: (symbol) => ['news', symbol],
    predictionHistory: () => ['predictionHistory'],
    symbols: () => ['symbols'],
    search: (query) => ['search', query],
  };