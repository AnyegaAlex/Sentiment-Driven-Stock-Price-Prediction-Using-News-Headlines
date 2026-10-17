// src/services/__tests__/news.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../client', () => ({
  default: {
    get: vi.fn(),
  },
}));

import apiClient from '../client';
import { fetchNews, searchSymbols } from '../news';

describe('news service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('fetchNews', () => {
    it('returns normalized success shape', async () => {
      apiClient.get.mockResolvedValue({
        success: true,
        data: {
          symbol: 'AAPL',
          count: 2,
          news: [{ title: 'A' }, { title: 'B' }],
          cache_stale: false,
        },
      });

      const result = await fetchNews('aapl');

      expect(result.success).toBe(true);
      expect(result.symbol).toBe('AAPL');
      expect(result.count).toBe(2);
      expect(result.news).toHaveLength(2);
      expect(apiClient.get).toHaveBeenCalledWith('/news/get-news/', {
        params: { symbol: 'AAPL' },
      });
    });

    it('rejects invalid symbol without calling API', async () => {
      const result = await fetchNews('');

      expect(result.success).toBe(false);
      expect(result.code).toBe(400);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('returns empty array on API error', async () => {
      apiClient.get.mockRejectedValue({
        success: false,
        error: 'Server error',
        code: 500,
      });

      const result = await fetchNews('AAPL');

      expect(result.success).toBe(false);
      expect(result.news).toEqual([]);
      expect(result.error).toBe('Server error');
    });
  });

  describe('searchSymbols', () => {
    it('returns results array on success', async () => {
      apiClient.get.mockResolvedValue([
        { symbol: 'AAPL', name: 'Apple' },
      ]);

      const result = await searchSymbols('app');

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
    });

    it('returns empty for query shorter than 2 chars', async () => {
      const result = await searchSymbols('a');

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });
});