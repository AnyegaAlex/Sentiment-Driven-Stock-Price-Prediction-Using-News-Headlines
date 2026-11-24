import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Breadcrumbs from './Breadcrumbs';
import { DashboardProvider } from '@/context/DashboardContext';

describe('Breadcrumbs', () => {
  it('does not repeat Dashboard between the Home icon and the selected ticker', () => {
    render(
      <DashboardProvider>
        <MemoryRouter initialEntries={['/dashboard/AAPL']}>
          <Routes>
            <Route path="/dashboard/:symbol" element={<Breadcrumbs />} />
          </Routes>
        </MemoryRouter>
      </DashboardProvider>
    );

    const homeLink = screen.getByRole('link', { name: 'Go to dashboard' });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveClass('hover:text-cyan-200', 'hover:underline', 'hover:underline-offset-4');
    expect(homeLink).not.toHaveClass('hover:bg-gray-800/80');
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('takes the Home breadcrumb to the dashboard, not the public landing page', async () => {
    const user = userEvent.setup();

    render(
      <DashboardProvider>
        <MemoryRouter initialEntries={['/news-analysis']}>
          <Routes>
            <Route path="/news-analysis" element={<Breadcrumbs />} />
            <Route path="/dashboard" element={<h1>Dashboard workspace</h1>} />
          </Routes>
        </MemoryRouter>
      </DashboardProvider>
    );

    await user.click(screen.getByRole('link', { name: 'Go to dashboard' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard workspace' })).toBeInTheDocument();
  });
});
