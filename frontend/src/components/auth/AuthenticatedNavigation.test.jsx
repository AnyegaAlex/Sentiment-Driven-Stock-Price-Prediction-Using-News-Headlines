import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthContext } from '@/context/AuthContext';
import { DashboardProvider } from '@/context/DashboardContext';
import Breadcrumbs from '@/components/Breadcrumbs';
import HomeRoute from './HomeRoute';
import ProtectedRoute from './ProtectedRoute';

describe('authenticated home navigation', () => {
  it('keeps a signed-in user inside the protected workspace when Home is clicked', async () => {
    const user = userEvent.setup();
    const auth = {
      user: { id: 7, username: 'reader', onboarded: true, email_verified: true, tier: 'free' },
      isAuthenticated: true,
      isLoading: false,
    };

    render(
      <AuthContext.Provider value={auth}>
        <DashboardProvider>
          <MemoryRouter initialEntries={['/news-analysis']}>
            <Routes>
              <Route
                path="/news-analysis"
                element={
                  <ProtectedRoute>
                    <>
                      <Breadcrumbs />
                      <h1>News workspace</h1>
                    </>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <h1>Dashboard workspace</h1>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  <HomeRoute>
                    <h1>Public landing page</h1>
                  </HomeRoute>
                }
              />
              <Route path="/login" element={<h1>Sign in</h1>} />
              <Route path="/verify-email" element={<h1>Verify your email</h1>} />
            </Routes>
          </MemoryRouter>
        </DashboardProvider>
      </AuthContext.Provider>
    );

    await user.click(screen.getByRole('link', { name: 'Go to dashboard' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard workspace' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Public landing page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });
});
