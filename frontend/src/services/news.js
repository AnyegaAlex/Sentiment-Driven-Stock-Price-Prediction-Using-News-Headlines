// services/news.js
/**
 * News API service — aligned with the unified client (client.js).
 *
 * The unified client returns the response body directly:
 *   - Success: { success: true, data: { symbol, count, news: [...] } }
 *   - Failure: rejects with { success: false, error, code, details }
 *
 * All functions return a normalized shape so the UI never has to deal with
 * undefined values, missing arrays, or thrown exceptions for expected errors.
 *
 * Endpoints used:
 *   - GET /api/v1/news/get-news/?symbol=AAPL
 *   - GET /api/v1/news/symbol-search/?q=app
 *   - GET /api/v1/news/analyzed/?symbol=AAPL     (legacy alias)
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
// News
// ============================================================================

/**
 * Fetch news articles with AI sentiment for a given symbol.
 *
 * @param {string} symbol - Stock ticker (e.g., "AAPL")
 * @returns {Promise<{
 *   success: boolean,
 *   symbol: string,
 *   count: number,
 *   news: Array,
 *   cacheStale: boolean,
 *   error?: string,
 *   code?: number,
 * }>}
 */
export const fetchNews = async (symbol) => {
  if (!symbol || !isValidSymbol(symbol)) {
    console.warn('[news] fetchNews called with invalid symbol:', symbol);
    return {
      success: false,
      symbol: String(symbol || '').toUpperCase(),
      count: 0,
      news: [],
      cacheStale: false,
      error: 'A valid stock symbol is required.',
      code: 400,
    };
  }

  const normalizedSymbol = symbol.trim().toUpperCase();

  try {
    const response = await apiClient.get('/news/get-news/', {
      params: { symbol: normalizedSymbol },
    });

    const payload = extract(response);
    const news = Array.isArray(payload.news) ? payload.news : [];

    return {
      success: true,
      symbol: payload.symbol || normalizedSymbol,
      count: payload.count ?? news.length,
      news,
      cacheStale: Boolean(payload.cache_stale),
    };
  } catch (err) {
    const e = normalizeError(err);
    console.error(`[news] Failed to fetch news for ${normalizedSymbol}:`, e);
    return {
      success: false,
      symbol: normalizedSymbol,
      count: 0,
      news: [],
      cacheStale: false,
      error: e.message,
      code: e.code,
    };
  }
};

/**
 * Legacy alias for `/news/analyzed/` (same payload as `get-news/`).
 * Kept for backward compatibility with older pages.
 *
 * @param {string} symbol
 */
export const fetchAnalyzedNews = fetchNews;

// ============================================================================
// Symbol Search (Autocomplete)
// ============================================================================

/**
 * Search stock symbols by partial name or ticker.
 *
 * @param {string} query - Partial symbol or company name (e.g., "app")
 * @returns {Promise<{ success: boolean, results: Array, error?: string }>}
 */
export const searchSymbols = async (query) => {
  const trimmed = (query || '').trim();

  // Backend requires at least 1 char; we require 2 to avoid spam
  if (trimmed.length < 2) {
    return { success: true, results: [] };
  }

  try {
    const response = await apiClient.get('/news/symbol-search/', {
      params: { q: trimmed },
    });

    const payload = extract(response);

    // The backend returns either an array or { results: [...] }
    const results = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.results)
      ? payload.results
      : [];

    return { success: true, results };
  } catch (err) {
    const e = normalizeError(err);
    console.error(`[news] Symbol search failed for "${trimmed}":`, e);
    return {
      success: false,
      results: [],
      error: e.message,
      code: e.code,
    };
  }
};

// ============================================================================
// Exports
// ============================================================================

export default {
  fetchNews,
  fetchAnalyzedNews,
  searchSymbols,
};