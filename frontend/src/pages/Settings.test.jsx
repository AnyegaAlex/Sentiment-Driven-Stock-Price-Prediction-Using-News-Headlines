import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/services/client';
import Settings from './Settings';

vi.mock('@/services/client', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 42, username: 'reader' } }),
}));
vi.mock('@/components/settings/GeneralTab', () => ({ default: () => <div>General panel</div> }));
vi.mock('@/components/settings/NotificationsTab', () => ({ default: () => <div>Notifications panel</div> }));
vi.mock('@/components/settings/SecurityTab', () => ({ default: () => <div>Security panel</div> }));
vi.mock('@/components/settings/AccountTab', () => ({ default: () => <div>Account panel</div> }));
vi.mock('@/components/settings/DeveloperTab', () => ({ default: () => <div>Developer panel</div> }));

const renderSettings = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/settings?tab=investment']}>
        <Settings />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Settings investment profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({
      investment_goal: 'trading',
      risk_tolerance: 'aggressive',
      experience_level: 'advanced',
    });
    apiClient.patch.mockResolvedValue({
      investment_goal: 'trading',
      risk_tolerance: 'conservative',
      experience_level: 'advanced',
    });
  });

  it('loads the flat preferences response and lets the user save an updated risk profile', async () => {
    const user = userEvent.setup();

    renderSettings();

    expect(await screen.findByLabelText('Risk tolerance')).toHaveValue('aggressive');

    await user.selectOptions(screen.getByLabelText('Risk tolerance'), 'conservative');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(apiClient.patch).toHaveBeenCalledWith('/auth/preferences/', {
      investment_goal: 'trading',
      risk_tolerance: 'conservative',
      experience_level: 'advanced',
    });
    expect(await screen.findByText('Your investment profile has been saved.')).toBeInTheDocument();
  });

  it('discards unsaved profile edits', async () => {
    const user = userEvent.setup();

    renderSettings();

    const riskSelect = await screen.findByLabelText('Risk tolerance');

    await user.selectOptions(riskSelect, 'moderate');
    expect(riskSelect).toHaveValue('moderate');

    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(riskSelect).toHaveValue('aggressive');
  });
});
