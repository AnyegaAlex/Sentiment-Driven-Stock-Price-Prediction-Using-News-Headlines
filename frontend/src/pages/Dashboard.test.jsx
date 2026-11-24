import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardProvider } from '@/context/DashboardContext';
import apiClient from '@/services/client';
import Dashboard from './Dashboard';

vi.mock('@/services/client', () => ({
  default: { get: vi.fn() },
}));

vi.mock('@/components/cards/StockOpinionCard', () => ({
  default: ({ riskType }) => <output aria-label="Risk passed to analysis">{riskType}</output>,
}));
vi.mock('@/components/cards/TechnicalIndicatorsCard', () => ({
  default: () => <div>Technical indicators</div>,
}));
vi.mock('@/components/cards/SentimentAnalysisCard', () => ({
  default: () => <div>Sentiment analysis</div>,
}));

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardProvider>
        <MemoryRouter initialEntries={['/dashboard/AAPL']}>
          <Routes>
            <Route path="/dashboard/:symbol" element={<Dashboard />} />
          </Routes>
        </MemoryRouter>
      </DashboardProvider>
    </QueryClientProvider>
  );
};

describe('Dashboard risk profile', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('uses and labels the saved risk profile returned by the flat preferences endpoint', async () => {
    apiClient.get.mockResolvedValueOnce({ risk_tolerance: 'aggressive' });

    renderDashboard();

    expect(await screen.findByText(/Saved risk profile:/)).toBeInTheDocument();
    expect(screen.getByText('aggressive')).toBeInTheDocument();
    expect(screen.getByLabelText('Risk passed to analysis')).toHaveTextContent('high');
  });

  it('does not present the moderate fallback as a saved preference', async () => {
    apiClient.get.mockResolvedValueOnce({});

    renderDashboard();

    expect(await screen.findByText(/No saved risk profile/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Risk passed to analysis')).toHaveTextContent('medium');
  });
});
