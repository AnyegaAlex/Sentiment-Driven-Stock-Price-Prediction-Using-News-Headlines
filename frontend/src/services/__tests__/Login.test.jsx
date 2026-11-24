// src/pages/__tests__/Login.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock useAuth
const mockLogin = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    isLoading: false,
    user: null,
  }),
}));

// Mock useErrorHandler
vi.mock('@/utils/errorHandler', async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorHandler: () => ({
    error: null,
    handleError: vi.fn(),
    clearError: vi.fn(),
  }),
}));

// Mock lightweight UI
vi.mock('@/assets/Primary Icon White.svg', () => ({
  default: 'logo.svg',
}));

import Login from '../../pages/Login';

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<div>Onboarding Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/signup" element={<div>Signup Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('Login page', () => {
  it('keeps the recovery link readable as a single line on narrow screens', () => {
    renderLogin();

    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveClass('shrink-0', 'whitespace-nowrap');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('navigates to onboarding on successful login with onboarded=false', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      success: true,
      user: { id: 1, username: 'test', onboarded: false, email_verified: true },
    });

    renderLogin();

    await user.type(screen.getByLabelText(/username or email/i), 'test');
    await user.type(screen.getByLabelText(/^password$/i), 'pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Onboarding Page')).toBeInTheDocument();
    });
  });

  it('navigates to dashboard on successful login with onboarded=true', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      success: true,
      user: { id: 1, username: 'test', onboarded: true, email_verified: true },
    });

    renderLogin();

    await user.type(screen.getByLabelText(/username or email/i), 'test');
    await user.type(screen.getByLabelText(/^password$/i), 'pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
  });

  it('shows "verify email" message on 403 EMAIL_NOT_VERIFIED', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: 'Please verify your email before logging in.',
      code: 403,
      details: { email: 'test@example.com' },
    });

    renderLogin();

    await user.type(screen.getByLabelText(/username or email/i), 'test');
    await user.type(screen.getByLabelText(/^password$/i), 'pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email address still needs to be verified/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /resend verification email/i })).toBeInTheDocument();
    });
  });

  it('shows rate-limit message on 429', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: 'Too many login attempts',
      code: 429,
    });

    renderLogin();

    await user.type(screen.getByLabelText(/username or email/i), 'test');
    await user.type(screen.getByLabelText(/^password$/i), 'pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many sign-in attempts/i)).toBeInTheDocument();
    });
  });

  it('shows invalid credentials on 401', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: 'Invalid credentials',
      code: 401,
    });

    renderLogin();

    await user.type(screen.getByLabelText(/username or email/i), 'test');
    await user.type(screen.getByLabelText(/^password$/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/username\/email or password is incorrect/i)).toBeInTheDocument();
    });
  });

  it('validates empty fields before calling API', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockLogin).not.toHaveBeenCalled();
    expect(screen.getByText(/enter your username or email address and password/i)).toBeInTheDocument();
  });
});