import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthSessionContext as AuthContext } from '@/context/AuthSessionProvider';
import HomeRoute from './HomeRoute';

const Location = () => {
  const location = useLocation();
  return <output aria-label="Current route">{location.pathname}</output>;
};

const renderAtRoot = (auth) =>
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <HomeRoute>
                <h1>Public landing page</h1>
              </HomeRoute>
            }
          />
          <Route path="/dashboard" element={<h1>Dashboard workspace</h1>} />
          <Route path="/onboarding" element={<h1>Finish setting up your account</h1>} />
          <Route path="/login" element={<h1>Sign in</h1>} />
        </Routes>
        <Location />
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('HomeRoute', () => {
  it('shows the public landing page to signed-out visitors', () => {
    renderAtRoot({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    expect(screen.getByRole('heading', { name: 'Public landing page' })).toBeInTheDocument();
  });

  it('returns an onboarded user to the dashboard instead of the landing page', async () => {
    renderAtRoot({
      user: { id: 1, onboarded: true },
      isAuthenticated: true,
      isLoading: false,
    });

    expect(await screen.findByRole('heading', { name: 'Dashboard workspace' })).toBeInTheDocument();
  });

  it('sends a signed-in user who has not completed onboarding to onboarding', async () => {
    renderAtRoot({
      user: { id: 2, onboarded: false },
      isAuthenticated: true,
      isLoading: false,
    });

    expect(await screen.findByRole('heading', { name: 'Finish setting up your account' })).toBeInTheDocument();
  });

  it('sends an incomplete authenticated state to sign in instead of onboarding or landing', async () => {
    renderAtRoot({
      user: null,
      isAuthenticated: true,
      isLoading: false,
    });

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('waits for session restoration before choosing a destination', () => {
    renderAtRoot({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });

    expect(screen.getByRole('status', { name: 'Checking your session...' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Public landing page' })).not.toBeInTheDocument();
  });
});
