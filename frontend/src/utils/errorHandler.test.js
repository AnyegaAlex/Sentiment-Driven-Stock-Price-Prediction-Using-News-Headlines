import { describe, expect, it, vi } from 'vitest';

vi.mock('@/sentry', () => ({ captureException: vi.fn() }));

import {
  ErrorCategory,
  getActionErrorMessage,
  getCardErrorMessage,
  handleApiError,
  isRetryableError,
} from './errorHandler';

describe('user-facing API error messages', () => {
  it.each(['ECONNABORTED', 'ETIMEDOUT'])('describes %s as a timeout', (code) => {
    const error = { code, message: 'timeout of 30000ms exceeded' };

    expect(getActionErrorMessage(error)).toBe(
      'The request took too long. Check your connection and try again.'
    );
    expect(getCardErrorMessage(error)).toBe(
      'The request took too long. Check your connection and try again.'
    );
    expect(handleApiError(error).category).toBe(ErrorCategory.TIMEOUT);
    expect(isRetryableError(error)).toBe(true);
  });

  it('keeps connection failures distinct from timeouts', () => {
    const result = handleApiError({
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to server.',
    });

    expect(result.category).toBe(ErrorCategory.NETWORK);
    expect(result.userMessage).toBe(
      'We can’t reach TickFlow right now. Check your internet connection and try again.'
    );
  });

  it('does not expose a raw transport error to the user', () => {
    expect(getActionErrorMessage({
      code: 'ECONNRESET',
      message: 'socket hang up',
    })).toBe(
      'We can’t reach TickFlow right now. Check your internet connection and try again.'
    );
  });

  it('includes the retry interval for rate limits', () => {
    expect(getActionErrorMessage({ code: 429, retryAfter: 45 })).toBe(
      'Please wait 45 seconds before trying again.'
    );
  });

  it('preserves field validation guidance', () => {
    expect(getActionErrorMessage({
      code: 400,
      message: 'Validation failed',
      details: { email: ['Enter a valid email address.'] },
    })).toBe('Enter a valid email address.');
  });

  it('uses API field errors instead of an Axios status string', () => {
    expect(getActionErrorMessage({
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: { email: ['Enter a valid email address.'] },
      },
    })).toBe('Enter a valid email address.');
  });

  it('uses a conflict explanation instead of an Axios status string', () => {
    expect(getActionErrorMessage({
      message: 'Request failed with status code 409',
      response: { status: 409, data: {} },
    })).toBe('This change conflicts with information already on your account.');
  });
});
