/**
 * Transforms backend API response to frontend expected format
 */
export const transformStockAnalysis = (apiResponse) => {
  const data = apiResponse.data || apiResponse;
  
  return {
    company: data.company || '',
    symbol: data.symbol || '',
    recommendation: data.recommendation || 'HOLD',
    confidence: data.confidence || 0.5,
    sentiment: data.sentiment?.score || 0,
    sentimentLabel: data.sentiment?.overall || 'Neutral',
    lastUpdated: data.lastUpdated || new Date().toISOString(),
    technicalIndicators: {
      currentPrice: data.technicalIndicators?.currentPrice || 0,
      sma50: data.technicalIndicators?.sma50 || 0,
      sma200: data.technicalIndicators?.sma200 || 0,
      rsi: data.technicalIndicators?.rsi || 50,
      support: data.technicalIndicators?.support || 0,
      resistance: data.technicalIndicators?.resistance || 0,
      volume: data.technicalIndicators?.volume || 0,
    },
    priceTargets: {
      bearish: data.priceTargets?.bearish || 0,
      base: data.priceTargets?.base || 0,
      bullish: data.priceTargets?.bullish || 0,
    },
    keyFactors: data.keyFactors || [],
    riskAssessment: data.riskAssessment || { level: 'medium', horizon: 'medium-term' },
    lstmPrediction: data.lstm_prediction || null,
  };
};

export const transformTechnicalIndicators = (apiResponse) => {
  const data = apiResponse.data || apiResponse;
  const tech = data.technical || {};
  
  return {
    technical: {
      current_price: tech.current_price || 0,
      sma_50: tech.sma_50 || 0,
      sma_200: tech.sma_200 || 0,
      rsi: tech.rsi || 50,
      support: tech.support || 0,
      resistance: tech.resistance || 0,
      pivot: tech.pivot || 0,
      volume: tech.volume || 0,
      volatility: tech.volatility || 0,
      price_history: tech.price_history || [],
    }
  };
};

export const transformNews = (apiResponse) => {
  const data = apiResponse.data || apiResponse;
  const news = data.news || data || [];
  
  return Array.isArray(news) ? news.map(item => ({
    id: item.id || item.url || `news-${Date.now()}`,
    title: item.title || 'No title',
    summary: item.summary || '',
    source: item.source || item.source_name || 'Unknown',
    source_reliability: item.source_reliability || 0,
    published_at: item.published_at || new Date().toISOString(),
    sentiment: item.sentiment || 'neutral',
    confidence: item.confidence || 0.5,
    key_phrases: item.key_phrases || [],
    banner_image_url: item.banner_image_url || '',
    url: item.url || '#',
    symbol: item.symbol || '',
  })) : [];
};

export const transformSymbols = (apiResponse) => {
  const data = apiResponse.data || apiResponse;
  const symbols = Array.isArray(data) ? data : (data.symbols || []);
  
  return symbols.map(item => ({
    symbol: item.symbol || item['1. symbol'] || '',
    name: item.name || item['2. name'] || '',
    region: item.region || item['4. region'] || 'US',
  }));
};

export const transformPredictionHistory = (apiResponse) => {
  const data = apiResponse.data || apiResponse;
  const predictions = Array.isArray(data) ? data : (data.results || data || []);
  
  return predictions.map(item => ({
    id: item.id || `pred-${Date.now()}`,
    created_at: item.date || item.created_at || new Date().toISOString(),
    prediction: item.predicted_movement || item.prediction || 'HOLD',
    confidence: item.confidence || 0.5,
    stock_symbol: item.stock_symbol || item.symbol || '',
    headline: item.headline || '',
    sentiment_score: item.sentiment_score || 0,
    source: item.source || 'System',
  }));
};