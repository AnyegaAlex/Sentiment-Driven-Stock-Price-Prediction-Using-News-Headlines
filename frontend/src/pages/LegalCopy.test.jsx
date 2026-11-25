import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Privacy from './Privacy';
import Terms from './Terms';

describe('hosted app legal pages', () => {
  it('renders the privacy draft with its scope, data categories and contact', () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText(/Draft for review\. Not yet effective\./i)).toBeInTheDocument();
    expect(screen.getByText(/intelligence\.tickflowcapital\.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Verification data/i)).toBeInTheDocument();
    expect(screen.getByText(/We do not sell personal data/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'privacy@tickflowcapital.com' })).toHaveAttribute(
      'href',
      'mailto:privacy@tickflowcapital.com'
    );
    expect(screen.queryByText(/privacy@tickflow\.com/i)).not.toBeInTheDocument();
  });

  it('keeps analytics consent controls available from the privacy page', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /manage privacy preferences/i }));
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'tickflow:open-consent-settings',
    }));
    dispatchSpy.mockRestore();
  });

  it('explains the hosted service and separates it from the MIT-licensed repository', () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByText(/Draft for review\. Not yet effective\./i)).toBeInTheDocument();
    expect(screen.getByText(/not recommendations to buy, sell or hold any security/i)).toBeInTheDocument();
    expect(screen.getByText(/The public source code in the repository is licensed under the MIT License/i)).toBeInTheDocument();
    expect(screen.getByText(/Ownership review required/i)).toBeInTheDocument();
    expect(screen.queryByText(/All content and code in TickFlow Intelligence is open source/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'legal@tickflowcapital.com' })).toHaveAttribute(
      'href',
      'mailto:legal@tickflowcapital.com'
    );
  });
});
