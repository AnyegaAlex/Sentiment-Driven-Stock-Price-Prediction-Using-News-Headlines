// src/services/__tests__/stocks.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../client', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../news', () => ({
  fetchNews: vi.fn().mockResolvedValue({
    success: true,
    news: [{ title: 'A' }],
  }),
}));

import apiClient from '../client';
import {
  fetchStockAnalysis,
  fetchTechnicalIndicators,
  fetchSentiment,
  fetchLSTMPrediction,
  fetchSymbols,
  fetchStockData,
} from '../stocks';

describe('stocks service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('fetchStockAnalysis', () => {
    it('calls /stock-analysis/ with correct params', async () => {
      apiClient.get.mockResolvedValue({
        success: true,
        data: { symbol: 'AAPL', recommendation: 'BUY' },
      });

      const result = await fetchStockAnalysis('aapl', 'high', 'short-term');

      expect(result.success).toBe(true);
      expect(result.data.recommendation).toBe('BUY');
      expect(apiClient.get).toHaveBeenCalledWith('/stock-analysis/', {
        params: { symbol: 'AAPL', risk_type: 'high', hold_time: 'short-term' },
      });
    });

    it('rejects invalid symbol', async () => {
      const result = await fetchStockAnalysis('!!');

      expect(result.success).toBe(false);
      expect(result.code).toBe(400);
    });
  });

  describe('fetchTechnicalIndicators', () => {
    it('unwraps technical field', async () => {
      apiClient.get.mockResolvedValue({
        success: true,
        data: { technical: { rsi: 55, sma_50: 100 } },
      });

      const result = await fetchTechnicalIndicators('AAPL', '1d');

      expect(result.success).toBe(true);
      expect(result.technical.rsi).toBe(55);
    });
  });

  describe('fetchSentiment', () => {
    it('returns sentiment, newsCount, history', async () => {
      apiClient.get.mockResolvedValue({
        success: true,
        data: {
          sentiment: { score: 0.5, label: 'Bullish' },
          news_count: 10,
          history: [{ date: '2026-01-01', score: 0.5 }],
        },
      });

      const result = await fetchSentiment('AAPL', '30d');

      expect(result.success).toBe(true);
      expect(result.sentiment.label).toBe('Bullish');
      expect(result.newsCount).toBe(10);
      expect(result.history).toHaveLength(1);
    });
  });

  describe('fetchLSTMPrediction', () => {
    it('returns prediction with confidence', async () => {
      apiClient.get.mockResolvedValue({
        success: true,
        data: {
          symbol: 'AAPL',
          prediction: 'UP',
          confidence: 85,
          sentiment_score: 0.6,
        },
      });

      const result = await fetchLSTMPrediction('AAPL');

      expect(result.success).toBe(true);
      expect(result.prediction).toBe('UP');
      expect(result.confidence).toBe(85);
    });

    it('returns HOLD fallback on error', async () => {
      apiClient.get.mockRejectedValue({ success: false, code: 500 });

      const result = await fetchLSTMPrediction('AAPL');

      expect(result.success).toBe(false);
      expect(result.prediction).toBe('HOLD');
      expect(result.confidence).toBe(50);
    });
  });

  describe('fetchSymbols', () => {
    it('returns array of symbols', async () => {
      apiClient.get.mockResolvedValue([
        { symbol: 'AAPL', name: 'Apple' },
        { symbol: 'MSFT', name: 'Microsoft' },
      ]);

      const result = await fetchSymbols();

      expect(result.success).toBe(true);
      expect(result.symbols).toHaveLength(2);
    });
  });

  describe('fetchStockData (legacy)', () => {
    it('combines analysis, technicals, and news', async () => {
      // Analysis
      apiClient.get
        .mockResolvedValueOnce({
          success: true,
          data: {
            lstm_prediction: { direction: 'UP', confidence: 70 },
          },
        })
        // Technicals
        .mockResolvedValueOnce({
          success: true,
          data: { technical: { price_history: [100, 101, 102] } },
        });

      const result = await fetchStockData('AAPL');

      expect(result.success).toBe(true);
      expect(result.historical).toEqual([100, 101, 102]);
      expect(result.prediction.direction).toBe('UP');
      expect(result.news).toHaveLength(1);
    });
  });
});