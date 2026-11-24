import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthSessionContext as AuthContext } from '@/context/AuthSessionProvider';
import ProtectedRoute from './ProtectedRoute';

const CurrentPath = () => {
  const location = useLocation();
  return <output aria-label="Current route">{location.pathname}</output>;
};

const renderProtectedRoute = ({
  auth,
  initialEntry = '/dashboard',
  requireVerified = true,
  requiredTiers = [],
} = {}) =>
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                requireVerified={requireVerified}
                requiredTiers={requiredTiers}
              >
                <h1>Dashboard workspace</h1>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<h1>Sign in</h1>} />
          <Route path="/verify-email" element={<h1>Verify your email</h1>} />
          <Route path="/unauthorized" element={<h1>Access not included</h1>} />
        </Routes>
        <CurrentPath />
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('ProtectedRoute', () => {
  it('sends signed-out visitors to sign in', () => {
    renderProtectedRoute({
      auth: { user: null, isAuthenticated: false, isLoading: false },
    });

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/login');
  });

  it('requires email verification even when onboarding is complete', () => {
    renderProtectedRoute({
      auth: {
        user: { id: 1, onboarded: true, email_verified: false, tier: 'free' },
        isAuthenticated: true,
        isLoading: false,
      },
    });

    expect(screen.getByRole('heading', { name: 'Verify your email' })).toBeInTheDocument();
  });

  it('does not let a demo query parameter bypass authentication', () => {
    renderProtectedRoute({
      initialEntry: '/dashboard?demo=true',
      auth: { user: null, isAuthenticated: false, isLoading: false },
    });

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('blocks routes above the signed-in user tier', () => {
    renderProtectedRoute({
      requiredTiers: ['pro', 'enterprise'],
      auth: {
        user: { id: 1, onboarded: true, email_verified: true, tier: 'free' },
        isAuthenticated: true,
        isLoading: false,
      },
    });

    expect(screen.getByRole('heading', { name: 'Access not included' })).toBeInTheDocument();
  });
});
