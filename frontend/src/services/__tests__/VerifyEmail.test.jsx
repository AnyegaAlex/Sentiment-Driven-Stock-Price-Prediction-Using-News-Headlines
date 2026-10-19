// src/pages/__tests__/VerifyEmail.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock client
vi.mock('@/services/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    refreshUser: vi.fn(async () => ({
      id: 1,
      email_verified: true,
      onboarded: false,
    })),
  }),
}));

// Mock UI components (heavy dependencies)
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardTitle: ({ children }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }) => <p>{children}</p>,
}));

vi.mock('@/components/shared/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="spinner">Loading...</div>,
}));

vi.mock('@/assets/Primary Icon White.svg', () => ({
  default: 'logo.svg',
}));

import apiClient from '@/services/client';
import VerifyEmail from '../VerifyEmail';

// Helper to render with a URL
const renderWithUrl = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/onboarding" element={<div>Onboarding Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('VerifyEmail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  // ==========================================================================
  // Token verification
  // ==========================================================================

  it('shows verifying state while token is being checked', () => {
    // Never resolves — simulates slow network
    apiClient.get.mockReturnValue(new Promise(() => {}));

    renderWithUrl('/verify-email?token=abc&uid=123');

    expect(screen.getByText(/verifying your email/i)).toBeInTheDocument();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('persists tokens and shows success on valid token', async () => {
    apiClient.get.mockResolvedValueOnce({
      success: true,
      data: {
        access: 'access-token',
        refresh: 'refresh-token',
        user: { id: 1, email_verified: true, onboarded: false },
        redirect: '/onboarding',
      },
    });

    renderWithUrl('/verify-email?token=abc&uid=123');

    await waitFor(() => {
      expect(screen.getByText(/email verified/i)).toBeInTheDocument();
    });

    expect(localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')).toBe(
      'access-token'
    );
    expect(localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')).toBe(
      'refresh-token'
    );
  });

  it('reads redirect from payload.redirect (backend contract)', async () => {
    apiClient.get.mockResolvedValueOnce({
      success: true,
      data: {
        access: 'acc',
        refresh: 'ref',
        user: { id: 1, email_verified: true, onboarded: true },
        redirect: '/onboarding', // Backend says onboarding even though onboarded=true
      },
    });

    renderWithUrl('/verify-email?token=abc&uid=123');

    await waitFor(() => {
      expect(screen.getByText(/email verified/i)).toBeInTheDocument();
    });
  });

  it('shows error state on invalid token', async () => {
    apiClient.get.mockRejectedValueOnce({
      success: false,
      error: 'Invalid or expired verification link',
      code: 400,
    });

    renderWithUrl('/verify-email?token=bad&uid=123');

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/invalid or expired/i)).toBeInTheDocument();
  });

  it('handles "already verified" idempotently', async () => {
    apiClient.get.mockRejectedValueOnce({
      success: false,
      error: 'Email already verified',
      code: 400,
    });

    renderWithUrl('/verify-email?token=abc&uid=123');

    await waitFor(() => {
      // Should not show error — should navigate through
      expect(screen.queryByText(/verification failed/i)).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Manual code entry
  // ==========================================================================

  it('shows manual entry when no token in URL', () => {
    renderWithUrl('/verify-email');

    expect(screen.getByText(/enter verification code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
  });

  it('verifies via code entry and persists tokens', async () => {
    const user = userEvent.setup();

    apiClient.post.mockResolvedValueOnce({
      success: true,
      data: {
        access: 'code-access',
        refresh: 'code-refresh',
        user: { id: 1, email_verified: true, onboarded: false },
      },
    });

    renderWithUrl('/verify-email');

    const input = screen.getByLabelText(/verification code/i);
    await user.type(input, '123456');

    const verifyBtn = screen.getByRole('button', { name: /verify email/i });
    await user.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/email verified/i)).toBeInTheDocument();
    });

    expect(localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')).toBe(
      'code-access'
    );
  });

  it('shows error on invalid code', async () => {
    const user = userEvent.setup();

    apiClient.post.mockRejectedValueOnce({
      success: false,
      error: 'Invalid verification code',
      code: 400,
    });

    renderWithUrl('/verify-email');

    const input = screen.getByLabelText(/verification code/i);
    await user.type(input, '999999');

    const verifyBtn = screen.getByRole('button', { name: /verify email/i });
    await user.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Resend
  // ==========================================================================

  it('sends resend email when button clicked with email present', async () => {
    const user = userEvent.setup();

    apiClient.get.mockRejectedValueOnce({
      success: false,
      error: 'Invalid token',
      code: 400,
    });
    apiClient.post.mockResolvedValueOnce({ success: true });

    renderWithUrl('/verify-email?token=bad&uid=1&email=user%40test.com');

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    });

    const resendBtn = screen.getByRole('button', { name: /resend verification email/i });
    await user.click(resendBtn);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/resend-verification/',
      { email: 'user@test.com' }
    );
  });

  it('shows resend error on 429 rate limit', async () => {
    const user = userEvent.setup();

    apiClient.get.mockRejectedValueOnce({ success: false, error: 'Invalid', code: 400 });
    apiClient.post.mockRejectedValueOnce({
      success: false,
      error: 'Please wait 60 seconds',
      code: 429,
    });

    renderWithUrl('/verify-email?token=bad&uid=1&email=user%40test.com');

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    });

    const resendBtn = screen.getByRole('button', { name: /resend verification email/i });
    await user.click(resendBtn);

    await waitFor(() => {
      expect(screen.getByText(/please wait 60 seconds/i)).toBeInTheDocument();
    });
  });
});