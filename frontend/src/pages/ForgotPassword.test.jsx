import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/authService', () => ({
  default: { requestPasswordReset: vi.fn() },
}));
vi.mock('@/assets/Primary Icon White.svg', () => ({ default: 'logo.svg' }));

import AuthService from '@/services/authService';
import ForgotPassword from './ForgotPassword';

const renderPage = () => render(
  <MemoryRouter>
    <ForgotPassword />
  </MemoryRouter>
);

describe('ForgotPassword copy and validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows one clear inline message for an empty email', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Email is required.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(AuthService.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('shows one clear inline message for an invalid email', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(AuthService.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('uses the server retry interval in a rate-limit message', async () => {
    const user = userEvent.setup();
    AuthService.requestPasswordReset.mockResolvedValueOnce({
      success: false,
      code: 429,
      error: 'Too many requests',
      retryAfter: 37,
    });
    renderPage();

    await user.type(screen.getByLabelText(/email address/i), 'reader@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please wait 37 seconds before trying again.'
    );
  });

  it('keeps the success message neutral about whether an account exists', async () => {
    const user = userEvent.setup();
    AuthService.requestPasswordReset.mockResolvedValueOnce({ success: true });
    renderPage();

    await user.type(screen.getByLabelText(/email address/i), 'reader@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'If an account matches that email address, you’ll receive a reset link.'
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
