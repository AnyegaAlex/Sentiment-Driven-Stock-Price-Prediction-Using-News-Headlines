import { describe, expect, it } from 'vitest';
import * as Sentry from '@sentry/react';
import { initSentry, scrubSentryEvent } from './sentry';

describe('Sentry event privacy filtering', () => {
  it('does not initialize the production Sentry project in local development by default', () => {
    expect(initSentry()).toBeNull();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('removes user identity, request bodies, query strings and sensitive headers', () => {
    const event = {
      message: 'Failure for person@example.test',
      user: { id: 'account-123', email: 'person@example.test', username: 'person' },
      request: {
        url: 'https://intelligence.tickflowcapital.com/reset?token=secret&email=person@example.test',
        headers: {
          Authorization: 'Bearer synthetic-secret-token',
          Cookie: 'sessionid=synthetic-cookie',
          'X-Forwarded-For': '203.0.113.10',
          Accept: 'application/json',
        },
        data: { password: 'synthetic-password', email: 'person@example.test' },
      },
      extra: { email: 'person@example.test', area: 'dashboard' },
    };

    const result = scrubSentryEvent(event);

    expect(result.user).toBeUndefined();
    expect(result.request.url).toBe('https://intelligence.tickflowcapital.com/reset');
    expect(result.request.data).toBeUndefined();
    expect(result.request.headers.Authorization).toBe('[REDACTED]');
    expect(result.request.headers.Cookie).toBe('[REDACTED]');
    expect(result.request.headers['X-Forwarded-For']).toBe('[REDACTED]');
    expect(result.request.headers.Accept).toBe('application/json');
    expect(result.extra.email).toBe('[REDACTED]');
    expect(JSON.stringify(result)).not.toContain('person@example.test');
    expect(JSON.stringify(result)).not.toContain('synthetic-secret-token');
    expect(JSON.stringify(result)).not.toContain('synthetic-password');
    expect(JSON.stringify(result)).not.toContain('203.0.113.10');
  });

  it('redacts emails and bearer credentials in breadcrumb-like text', () => {
    const result = scrubSentryEvent({
      message: 'Contact person@example.test with Bearer synthetic-secret-token',
    });

    expect(result.message).toContain('[email]');
    expect(result.message).toContain('Bearer [REDACTED]');
    expect(result.message).not.toContain('person@example.test');
    expect(result.message).not.toContain('synthetic-secret-token');
  });
});
