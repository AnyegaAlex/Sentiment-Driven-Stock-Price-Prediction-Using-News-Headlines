import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchSymbolsQuery } from '@/hooks/queries/useSearchSymbolsQuery';
import SymbolSearchCard from './SymbolSearchCard';

vi.mock('@/hooks/queries/useSearchSymbolsQuery', () => ({
  useSearchSymbolsQuery: vi.fn(),
}));

const SUGGESTIONS = [
  { symbol: 'AAPL', name: 'Apple Inc.', region: 'United States' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', region: 'United States' },
];

describe('SymbolSearchCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchSymbolsQuery.mockImplementation((query) => ({
      data: query.length >= 2 ? SUGGESTIONS : [],
      isLoading: false,
      error: null,
    }));
  });

  it('lets users select a matching symbol with the keyboard', async () => {
    const user = userEvent.setup();
    const onSymbolSelect = vi.fn();

    render(<SymbolSearchCard onSymbolSelect={onSymbolSelect} />);

    const input = screen.getByRole('searchbox', { name: 'Search stocks by company or ticker' });
    await user.type(input, 'AA');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /AAPL.*Apple Inc/i })).toBeInTheDocument();
    });

    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSymbolSelect).toHaveBeenCalledWith('AAPL');
  });

  it('allows a known ticker to be entered directly when suggestions are unavailable', async () => {
    const user = userEvent.setup();
    const onSymbolSelect = vi.fn();
    useSearchSymbolsQuery.mockReturnValue({ data: [], isLoading: false, error: null });

    render(<SymbolSearchCard onSymbolSelect={onSymbolSelect} />);

    const input = screen.getByRole('searchbox', { name: 'Search stocks by company or ticker' });
    await user.type(input, 'AAPL');
    await user.keyboard('{Enter}');

    expect(onSymbolSelect).toHaveBeenCalledWith('AAPL');
  });

  it('notifies the parent when the search is cleared', async () => {
    const user = userEvent.setup();
    const onSymbolSelect = vi.fn();

    render(<SymbolSearchCard onSymbolSelect={onSymbolSelect} />);

    const input = screen.getByRole('searchbox', { name: 'Search stocks by company or ticker' });
    await user.type(input, 'AAPL');
    await user.click(screen.getByRole('button', { name: 'Clear stock search' }));

    expect(onSymbolSelect).toHaveBeenLastCalledWith(null);
    expect(input).toHaveValue('');
  });
});
