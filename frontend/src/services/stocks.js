// services/stocks.js
/**
 * Stocks API service — aligned with the unified client (client.js).
 *
 * The unified client returns the response body directly:
 *   - Success: { success: true, data: {...} }
 *   - Failure: rejects with { success: false, error, code, details }
 *
 * Every function returns a normalized shape so the UI never has to deal
 * with undefined values, missing arrays, or thrown exceptions for expected
 * errors.
 *
 * Endpoints used (all under /api/v1/):
 *   - GET /stock-analysis/?symbol=AAPL
 *   - GET /technical-indicators/?symbol=AAPL&timeframe=1d
 *   - GET /sentiment-analysis/?symbol=AAPL&time_range=7d
 *   - GET /lstm-predict/?symbol=AAPL
 *   - GET /symbols/
 *   - GET /prediction-history/?symbol=AAPL&limit=50&offset=0
 *   - GET /performance/?symbol=AAPL&days=30
 *   - GET /drift/?recent_days=30&baseline_days=90
 *   - GET /shap/<prediction_id>/
 *
 * @version 2.0.0
 */

import apiClient from './client';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts the inner payload from a unified client response.
 * Handles both nested `{ success, data: {...} }` and flat `{...}` shapes.
 */
const extract = (response) => {
  if (!response) return {};
  if (response.data && typeof response.data === 'object') return response.data;
  return response;
};

/**
 * Normalizes errors from the unified client.
 * The client rejects with: { success: false, error, code, details }
 */
const normalizeError = (err) => ({
  message: err?.error || err?.message || 'An unexpected error occurred.',
  code: err?.code || 500,
  details: err?.details || {},
});

/**
 * Validates a stock ticker symbol before making the request.
 * Prevents bad data from reaching the backend and creating noise in logs.
 */
const isValidSymbol = (symbol) =>
  typeof symbol === 'string' && /^[A-Z0-9.\-]{1,10}$/i.test(symbol.trim());

// ============================================================================
// Unified Stock Analysis
// ============================================================================

/**
 * Fetch the unified stock analysis (recommendation, sentiment, technicals,
 * price targets, key factors, risk assessment, and LSTM prediction).
 *
 * Backend: GET /api/v1/stock-analysis/?symbol=AAPL
 *
 * @param {string} symbol - Stock ticker (e.g., "AAPL")
 * @param {string} riskType - "low" | "medium" | "high" (default: "medium")
 * @param {string} holdTime - "short-term" | "medium-term" | "long-term" (default: "medium-term")
 * @returns {Promise<{
 *   success: boolean,
 *   symbol: string,
 *   data: Object|null,
 *   error?: string,
 *   code?: number,
 * }>}
 */
export const fetchStockAnalysis = async (
  symbol,
  riskType = 'medium',
  holdTime = 'medium-term'
) => {
  if (!symbol || !isValidSymbol(symbol)) {
    console.warn('[stocks] fetchStockAnalysis: invalid symbol:', symbol);
    return {
      success: false,
      symbol: String(symbol || '').toUpperCase(),
      data: null,
      error: 'A valid stock symbol is required.',
      code: 400,
    };
  }

  const normalizedSymbol = symbol.trim().toUpperCase();

  try {
    const response = await apiClient.get('/stock-analysis/', {
      params: {
        symbol: normalizedSymbol,
        risk_type: riskType,
        hold_time: holdTime,
      },
    });

    const payload = extract(response);

    return {
      success: true,
      symbol: payload.symbol || normalizedSymbol,
      data: payload,
    };
  } catch (err) {
    const e = normalizeError(err);
    console.error(`[stocks] Analysis failed for ${normalizedSymbol}:`, e);
    return {
      success: false,
      symbol: normalizedSymbol,
      data: null,
      error: e.message,
      code: e.code,
    };
  }
};

// ============================================================================
// Technical Indicators
// ============================================================================

/**
 * Fetch technical indicators (SMA50, SMA200, RSI, support/resistance, etc.).
 *
 * Backend: GET /api/v1/technical-indicators/?symbol=AAPL&timeframe=1d
 *
 * @param {string} symbol
 * @param {string} timeframe - "1d" | "1w" | "1m" | "3m" (default: "1d")
 */
export const fetchTechnicalIndicators = async (symbol, timeframe = '1d') => {
  if (!symbol || !isValidSymbol(symbol)) {
    return {
      success: false,
      symbol: String(symbol || '').toUpperCase(),
      technical: null,
      error: 'A valid stock symbol is required.',
      code: 400,
    };
  }

  const normalizedSymbol = symbol.trim().toUpperCase();

  try {
    const response = await apiClient.get('/technical-indicators/', {
      params: { symbol: normalizedSymbol, timeframe },
    });

    const payload = extract(response);

    // Backend returns { technical: {...} } — unwrap it
    const technical = payload.technical || payload;

    return {
      success: true,
      symbol: normalizedSymbol,
      technical,
    };
  } catch (err) {
    const e = normalizeError(err);
    console.error(`[stocks] Technicals failed for ${normalizedSymbol}:`, e);
    return {
      success: false,
      symbol: normalizedSymbol,
      technical: null,
      error: e.message,
      code: e.code,
    };
  }
};

// ============================================================================
// Sentiment Analysis
// ============================================================================

/**
 * Fetch aggregated sentiment analysis from recent news.
 *
 * Backend: GET /api/v1/sentiment-analysis/?symbol=AAPL&time_range=7d
 *
 * @param {string} symbol
 * @param {string} timeRange - "7d" | "30d" (default: "7d")
 */
export const fetchSentiment = async (symbol, timeRange = '7d') => {
  if (!symbol || !isValidSymbol(symbol)) {
    return {
      success: false,
      symbol: String(symbol || '').toUpperCase(),
      sentiment: { score: 0, label: 'Neutral' },
      newsCount: 0,
      sourceStats: { tier1_count: 0, reliability_sum: 0, tier1_sources: [] },
      history: [],
      error: 'A valid stock symbol is required.',
      code: 400,
    };
  }

  const normalizedSymbol = symbol.trim().toUpperCase();

  try {
    const response = await apiClient.get('/sentiment-analysis/', {
      params: { symbol: normalizedSymbol, time_range: timeRange },
    });

    const payload = extract(response);

    return {
      success: true,
      symbol: normalizedSymbol,
      sentiment: payload.sentiment || { score: 0, label: 'Neutral' },
      newsCount: payload.news_count || 0,
      sourceStats: payload.source_stats || {
        tier1_count: 0,
        reliability_sum: 0,
        tier1_sources: [],
      },
      history: Array.isArray(payload.history) ? payload.history : [],
    };
  } catch (err) {
    const e = normalizeError(err);
    console.error(`[stocks] Sentiment failed for ${normalizedSymbol}:`, e);
    return {
      success: false,
      symbol: normalizedSymbol,
      sentiment: { score: 0, label: 'Neutral' },
      newsCount: 0,
      sourceStats: { tier1_count: 0, reliability_sum: 0, tier1_sources: [] },
      history: [],
      error: e.message,
      code: e.code,
    };
  }
};

// ============================================================================
// LSTM Prediction
// ============================================================================

/**
 * Fetch the latest LSTM prediction (served from DB, populated by GitHub Actions).
 *
 * Backend: GET /api/v1/lstm-predict/?symbol=AAPL
 *
 * Note: This endpoint is READ-ONLY. It returns the latest prediction stored
 * in the database, generated asynchronously by the GitHub Actions pipeline.
 * It does NOT run the model synchronously on the request path.
 *
 * @param {string} symbol
 */
export const fetchLSTMPrediction = async (symbol) => {
  if (!symbol || !isValidSymbol(symbol)) {
    return {
      success: false,
      symbol: String(symbol || '').toUpperCase(),
      prediction: 'HOLD',
      confidence: 50,
      sentimentScore: 0,
      timestamp: null,
      error: 'A valid stock symbol is required.',
      code: 400,
    };
  }

  const normalizedSymbol = symbol.trim().toUpperCase();

  try {
    const response = await apiClient.get('/lstm-predict/', {
      params: { symbol: normalizedSymbol },
    });

    const payload = extract(response);

    return {
      success: true,
      symbol: normalizedSymbol,
      prediction: payload.prediction || 'HOLD',
      confidence: payload.confidence ?? 50,
      sentimentScore: payload.sentiment_score ?? 0,
      timestamp: payload.timestamp || null,
    };
  } catch (err) {
    const e = normalizeError(err);
    console.error(`[stocks] LSTM prediction failed for ${normalizedSymbol}:`, e);
    return {
      success: false,
      symbol: normalizedSymbol,
      prediction: 'HOLD',
      confidence: 50,
      sentimentScore: 0,
      timestamp: null,
      error: e.message,
      code: e.code,
    };
  }
};

// ============================================================================
// Symbols List
// ============================================================================

/**
 * Fetch the list of supported symbols.
 *
 * Backend: GET /api/v1/symbols/
 */
export const fetchSymbols = async () => {
  try {
    const response = await apiClient.get('/symbols/');
    const payload = extract(response);

    // Backend returns an array directly
    const symbols = Array.isArray(payload) ? payload : [];

    return { success: true, symbols };
  } catch (err) {
    const e = normalizeError(err);
    console.error('[stocks] Symbols list failed:', e);
    return { success: false, symbols: [], error: e.message, code: e.code };
  }
};

// ============================================================================
// Prediction History
// ============================================================================

/**
 * Fetch paginated prediction history.
 *
 * Backend: GET /api/v1/prediction-history/?symbol=AAPL&limit=50&offset=0
 *
 * @param {Object} params
 * @param {string} [params.symbol]
 * @param {number} [params.limit=50]
 * @param {number} [params.offset=0]
 */
export const fetchPredictionHistory = async ({
  symbol = '',
  limit = 50,
  offset = 0,
} = {}) => {
  try {
    const response = await apiClient.get('/prediction-history/', {
      params: {
        ...(symbol ? { symbol: symbol.toUpperCase() } : {}),
        limit: Math.min(Math.max(limit, 1), 200),
        offset: Math.max(offset, 0),
      },
    });

    const payload = extract(response);

    return {
      success: true,
      count: payload.count ?? 0,
      next: payload.next ?? null,
      previous: payload.previous ?? null,
      results: Array.isArray(payload.results) ? payload.results : [],
    };
  } catch (err) {
    const e = normalizeError(err);
    console.error('[stocks] Prediction history failed:', e);
    return {
      success: false,
      count: 0,
      next: null,
      previous: null,
      results: [],
      error: e.message,
      code: e.code,
    };
  }
};

// ============================================================================
// Performance Summary
// ============================================================================

/**
 * Fetch accuracy, precision, recall, F1, and per-symbol breakdown.
 *
 * Backend: GET /api/v1/performance/?symbol=AAPL&days=30
 *
 * @param {Object} params
 * @param {string} [params.symbol]
 * @param {number} [params.days=30]
 */
export const fetchPerformanceSummary = async ({ symbol = '', days = 30 } = {}) => {
  try {
    const response = await apiClient.get('/performance/', {
      params: {
        ...(symbol ? { symbol: symbol.toUpperCase() } : {}),
        days: Math.max(days, 1),
      },
    });

    const payload = extract(response);

    return {
      success: true,
      totalPredictions: payload.total_predictions ?? 0,
      resolvedPredictions: payload.resolved_predictions ?? 0,
      correctPredictions: payload.correct_predictions ?? 0,
      overall: payload.overall || {},
      recentAccuracy: payload.recent_accuracy ?? 0,
      bySymbol: payload.by_symbol || {},
    };
  } catch (err) {
    const e = normalizeError(err);
    console.error('[stocks] Performance summary failed:', e);
    return {
      success: false,
      totalPredictions: 0,
      resolvedPredictions: 0,
      correctPredictions: 0,
      overall: {},
      recentAccuracy: 0,
      bySymbol: {},
      error: e.message,
      code: e.code,
    };
  }
};

// ============================================================================
// Drift Detection
// ============================================================================

/**
 * Detect model drift by comparing recent performance vs baseline.
 *
 * Backend: GET /api/v1/drift/?recent_days=30&baseline_days=90
 *
 * @param {Object} params
 * @param {number} [params.recentDays=30]
 * @param {number} [params.baselineDays=90]
 */
export const fetchDrift = async ({ recentDays = 30, baselineDays = 90 } = {}) => {
  try {
    const response = await apiClient.get('/drift/', {
      params: { recent_days: recentDays, baseline_days: baselineDays },
    });

    const payload = extract(response);

    return {
      success: true,
      driftDetected: Boolean(payload.drift_detected),
      severity: payload.severity || 'none',
      recentF1: payload.recent_f1 ?? 0,
      baselineF1: payload.baseline_f1 ?? 0,
      dropPercent: payload.drop_percent ?? 0,
      recentMetrics: payload.recent_metrics || {},
      baselineMetrics: payload.baseline_metrics || {},
    };
  } catch (err) {
    const e = normalizeError(err);
    console.error('[stocks] Drift detection failed:', e);
    return {
      success: false,
      driftDetected: false,
      severity: 'none',
      recentF1: 0,
      baselineF1: 0,
      dropPercent: 0,
      recentMetrics: {},
      baselineMetrics: {},
      error: e.message,
      code: e.code,
    };
  }
};

// ============================================================================
// SHAP Explanation
// ============================================================================

/**
 * Fetch SHAP explanation for a specific prediction.
 *
 * Backend: GET /api/v1/shap/<prediction_id>/
 *
 * @param {number} predictionId
 */
export const fetchSHAPExplanation = async (predictionId) => {
  if (!predictionId || typeof predictionId !== 'number') {
    return {
      success: false,
      data: null,
      error: 'A valid prediction ID is required.',
      code: 400,
    };
  }

  try {
    const response = await apiClient.get(`/shap/${predictionId}/`);
    const payload = extract(response);

    return { success: true, data: payload };
  } catch (err) {
    const e = normalizeError(err);
    console.error(`[stocks] SHAP explanation failed for ${predictionId}:`, e);
    return { success: false, data: null, error: e.message, code: e.code };
  }
};

// ============================================================================
// Legacy Helper (Backward Compatibility)
// ============================================================================

/**
 * Legacy combined fetch — preserved for backward compatibility with older
 * pages that expect { historical, news, prediction }.
 *
 * Internally calls the analysis, technicals, and news endpoints in parallel.
 *
 * @param {string} symbol
 * @returns {Promise<{
 *   success: boolean,
 *   symbol: string,
 *   historical: Array,
 *   news: Array,
 *   prediction: Object,
 *   raw: { analysis: Object|null, technicals: Object|null, news: Object|null },
 * }>}
 */
export const fetchStockData = async (symbol) => {
  if (!symbol || !isValidSymbol(symbol)) {
    return {
      success: false,
      symbol: String(symbol || '').toUpperCase(),
      historical: [],
      news: [],
      prediction: { direction: 'HOLD', confidence: 0 },
      raw: { analysis: null, technicals: null, news: null },
    };
  }

  const normalizedSymbol = symbol.trim().toUpperCase();

  // Import news lazily to avoid circular dependencies
  const { fetchNews } = await import('./news');

  const [analysis, technicals, news] = await Promise.all([
    fetchStockAnalysis(normalizedSymbol),
    fetchTechnicalIndicators(normalizedSymbol),
    fetchNews(normalizedSymbol),
  ]);

  const prediction = analysis.data?.lstm_prediction || {
    direction: 'HOLD',
    confidence: 0,
  };

  return {
    success: analysis.success && technicals.success,
    symbol: normalizedSymbol,
    historical: technicals.technical?.price_history || [],
    news: news.news || [],
    prediction,
    raw: {
      analysis: analysis.data,
      technicals: technicals.technical,
      news: news.success ? news.news : null,
    },
  };
};

// ============================================================================
// Exports
// ============================================================================

export default {
  fetchStockAnalysis,
  fetchTechnicalIndicators,
  fetchSentiment,
  fetchLSTMPrediction,
  fetchSymbols,
  fetchPredictionHistory,
  fetchPerformanceSummary,
  fetchDrift,
  fetchSHAPExplanation,
  fetchStockData,
};