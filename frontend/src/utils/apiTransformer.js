/**
 * Normalize API payloads without inventing market facts.
 * Missing values stay null so the UI can explain what is unavailable.
 */

const unwrap = (response) => response?.data ?? response ?? {};

const finiteOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const transformStockAnalysis = (apiResponse) => {
  const data = unwrap(apiResponse);
  const technical = data.technicalIndicators || null;

  return {
    company: data.company || data.symbol || '',
    symbol: data.symbol || '',
    recommendation: data.recommendation ?? null,
    confidence: finiteOrNull(data.confidence),
    sentiment: data.sentiment ?? null,
    sentimentLabel: data.sentiment?.overall ?? data.sentiment?.label ?? null,
    lastUpdated: data.lastUpdated ?? null,
    dataStatus: data.dataStatus ?? {},
    technicalIndicators: technical
      ? {
          currentPrice: finiteOrNull(technical.currentPrice),
          sma50: finiteOrNull(technical.sma50),
          sma200: finiteOrNull(technical.sma200),
          rsi: finiteOrNull(technical.rsi),
          support: finiteOrNull(technical.support),
          resistance: finiteOrNull(technical.resistance),
          volume: finiteOrNull(technical.volume),
        }
      : null,
    priceTargets: data.priceTargets
      ? {
          bearish: finiteOrNull(data.priceTargets.bearish),
          base: finiteOrNull(data.priceTargets.base),
          bullish: finiteOrNull(data.priceTargets.bullish),
        }
      : null,
    keyFactors: Array.isArray(data.keyFactors) ? data.keyFactors : [],
    riskAssessment: data.riskAssessment ?? null,
    lstm_prediction: data.lstm_prediction ?? null,
  };
};

export const transformTechnicalIndicators = (apiResponse) => {
  const data = unwrap(apiResponse);
  const tech = data.technical;

  if (!tech || typeof tech !== 'object') {
    return {
      technical: null,
      status: data.status || 'unavailable',
      message: data.message || null,
    };
  }

  return {
    technical: {
      current_price: finiteOrNull(tech.current_price),
      sma_50: finiteOrNull(tech.sma_50),
      sma_200: finiteOrNull(tech.sma_200),
      rsi: finiteOrNull(tech.rsi),
      support: finiteOrNull(tech.support),
      resistance: finiteOrNull(tech.resistance),
      pivot: finiteOrNull(tech.pivot),
      volume: finiteOrNull(tech.volume),
      volatility: finiteOrNull(tech.volatility),
      price_history: Array.isArray(tech.price_history) ? tech.price_history : [],
      price_dates: Array.isArray(tech.price_dates) ? tech.price_dates : [],
      sma_50_series: Array.isArray(tech.sma_50_series) ? tech.sma_50_series : [],
      sma_200_series: Array.isArray(tech.sma_200_series) ? tech.sma_200_series : [],
    },
    status: data.status || 'available',
    message: data.message || null,
  };
};

export const transformNews = (apiResponse) => {
  const data = unwrap(apiResponse);
  const news = Array.isArray(data) ? data : Array.isArray(data.news) ? data.news : [];

  return news.map((item, index) => ({
    id: item.id ?? item.url ?? `news-${item.published_at || 'undated'}-${index}`,
    title: item.title || 'Untitled article',
    summary: item.summary || '',
    source: item.source || item.source_name || null,
    source_reliability: finiteOrNull(item.source_reliability),
    published_at: item.published_at ?? item.date ?? null,
    sentiment: item.sentiment ?? null,
    confidence: finiteOrNull(item.confidence),
    key_phrases: Array.isArray(item.key_phrases) ? item.key_phrases : [],
    banner_image_url: item.banner_image_url || '',
    url: item.url || null,
    symbol: item.symbol || '',
  }));
};

export const transformSymbols = (apiResponse) => {
  const data = unwrap(apiResponse);
  const symbols = Array.isArray(data) ? data : Array.isArray(data.symbols) ? data.symbols : [];

  return symbols.map((item) => ({
    symbol: item.symbol || item['1. symbol'] || '',
    name: item.name || item['2. name'] || '',
    region: item.region || item['4. region'] || null,
  })).filter((item) => item.symbol);
};

export const transformPredictionHistory = (apiResponse) => {
  const data = unwrap(apiResponse);
  const predictions = Array.isArray(data)
    ? data
    : Array.isArray(data.results)
      ? data.results
      : [];

  return predictions.map((item, index) => ({
    id: item.id ?? `prediction-${item.date || item.created_at || 'undated'}-${index}`,
    created_at: item.date ?? item.created_at ?? null,
    prediction: item.predicted_movement ?? item.prediction ?? null,
    confidence: finiteOrNull(item.confidence),
    stock_symbol: item.stock_symbol || item.symbol || '',
    headline: item.headline || '',
    sentiment_score: finiteOrNull(item.sentiment_score),
    source: item.source ?? null,
  }));
};
