import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

vi.mock('@/sentry', () => ({
  captureException: vi.fn(),
}));

import { captureException } from '@/sentry';

const BrokenSection = () => {
  throw new Error('Internal token parsing failure');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DEV', false);
  });

  it('recovers when the user navigates away from the route that crashed', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const RouteContent = ({ path }) => {
      if (path === '/broken') throw new Error('Broken route internals');
      return <h1>Dashboard is ready</h1>;
    };

    const { rerender } = render(
      <ErrorBoundary resetKeys={['/broken']}>
        <RouteContent path="/broken" />
      </ErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKeys={['/dashboard']}>
        <RouteContent path="/dashboard" />
      </ErrorBoundary>
    );

    expect(await screen.findByRole('heading', { name: 'Dashboard is ready' })).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('shows safe recovery guidance instead of exposing the exception to users', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenSection />
      </ErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText(/This part of TickFlow didn’t load as expected/i)).toBeInTheDocument();
    expect(screen.queryByText(/Internal token parsing failure/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(captureException).toHaveBeenCalledOnce();

    consoleError.mockRestore();
    vi.unstubAllEnvs();
  });
});
