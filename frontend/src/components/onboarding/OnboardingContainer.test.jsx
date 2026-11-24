import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingContainer from './OnboardingContainer';

const { updateUser, completeOnboarding } = vi.hoisted(() => ({
  updateUser: vi.fn(),
  completeOnboarding: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 42, username: 'reader', persona: 'researcher', onboarded: false },
    isAuthenticated: true,
    isLoading: false,
    updateUser,
  }),
}));

vi.mock('../../hooks/useOnboarding', () => ({
  useOnboarding: () => ({ completeOnboarding }),
}));

vi.mock('@/services/client', () => ({
  default: { patch: vi.fn() },
}));

vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }) => children,
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('react-confetti', () => ({ default: () => null }));

const renderOnboarding = () => render(
  <MemoryRouter>
    <OnboardingContainer />
  </MemoryRouter>
);

describe('onboarding journey feedback', () => {
  beforeEach(() => {
    updateUser.mockReset();
    completeOnboarding.mockReset().mockResolvedValue({});
    sessionStorage.setItem('onboardingStep', 'persona');
  });

  it('disables the step actions while the selected persona is being saved', async () => {
    const user = userEvent.setup();
    let finishSave;
    updateUser.mockImplementation(() => new Promise((resolve) => { finishSave = resolve; }));

    renderOnboarding();

    await user.click(screen.getByRole('button', { name: /Trader/ }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const saving = await screen.findByRole('button', { name: 'Saving...' });
    expect(saving).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skip setup' })).toBeDisabled();
    expect(updateUser).toHaveBeenCalledTimes(1);

    await user.click(saving);
    expect(updateUser).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishSave({ persona: 'trader' });
    });
  });

  it('keeps the saved persona when a refreshed session resumes at the tour', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('onboardingStep', 'tour');

    renderOnboarding();

    expect(screen.getByText(/Access historical data and model accuracy metrics/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Skip tour' }));

    expect(completeOnboarding).toHaveBeenCalledWith('researcher');
  });

  it('returns to the welcome step if the saved step is no longer valid', () => {
    sessionStorage.setItem('onboardingStep', 'removed-step');

    renderOnboarding();

    expect(screen.getByRole('heading', { name: 'Welcome, reader' })).toBeInTheDocument();
  });
});
