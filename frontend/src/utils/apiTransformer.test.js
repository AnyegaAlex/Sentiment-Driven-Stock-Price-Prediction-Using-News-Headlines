import { describe, expect, it } from 'vitest';
import {
  transformNews,
  transformPredictionHistory,
  transformStockAnalysis,
  transformTechnicalIndicators,
} from './apiTransformer';
import { getCardErrorMessage } from '@/utils/errorHandler';

describe('API transformers preserve unavailable data', () => {
  it('does not invent a recommendation, confidence, price, RSI, or timestamp', () => {
    const result = transformStockAnalysis({
      success: true,
      data: {
        symbol: 'AAPL',
        recommendation: null,
        confidence: null,
        sentiment: { score: 0, overall: 'Neutral', recent_articles: 0 },
        technicalIndicators: {
          currentPrice: null,
          sma50: null,
          sma200: null,
          rsi: null,
        },
        lstm_prediction: null,
      },
    });

    expect(result.recommendation).toBeNull();
    expect(result.confidence).toBeNull();
    expect(result.lastUpdated).toBeNull();
    expect(result.sentiment).toEqual({
      score: 0,
      overall: 'Neutral',
      recent_articles: 0,
    });
    expect(result.technicalIndicators.currentPrice).toBeNull();
    expect(result.technicalIndicators.rsi).toBeNull();
  });

  it('preserves technical chart dates and moving-average series', () => {
    const result = transformTechnicalIndicators({
      data: {
        status: 'live',
        technical: {
          current_price: 100,
          sma_50: null,
          sma_200: null,
          rsi: 48,
          price_history: [98, 99, 100],
          price_dates: ['2026-11-20', '2026-11-21', '2026-11-22'],
          sma_50_series: [null, null, null],
          sma_200_series: [null, null, null],
        },
      },
    });

    expect(result.technical.price_dates).toEqual([
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ]);
    expect(result.technical.sma_50_series).toEqual([null, null, null]);
    expect(result.technical.sma_50).toBeNull();
  });

  it('keeps missing news dates, confidence, and links unavailable', () => {
    const [article] = transformNews({
      data: {
        news: [{ title: 'Company update' }],
      },
    });

    expect(article.title).toBe('Company update');
    expect(article.published_at).toBeNull();
    expect(article.confidence).toBeNull();
    expect(article.url).toBeNull();
  });

  it('does not convert missing prediction fields into HOLD or 50% confidence', () => {
    const [prediction] = transformPredictionHistory({
      results: [{ stock_symbol: 'AAPL' }],
    });

    expect(prediction.prediction).toBeNull();
    expect(prediction.confidence).toBeNull();
    expect(prediction.created_at).toBeNull();
  });

  it('explains gated news and price data in user-facing language', () => {
    expect(getCardErrorMessage({ code: 503, serviceCode: 5030 })).toContain(
      'News analysis is not available for this account yet'
    );
    expect(getCardErrorMessage({ code: 503, serviceCode: 5031 })).toContain(
      'Market-data analysis is not available for this account yet'
    );
  });
});
