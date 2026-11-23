import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Privacy from './Privacy';
import Terms from './Terms';

describe('public legal copy', () => {
  it('describes account data without claiming payment details are collected', () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );

    expect(screen.getByText(/username, email address, and profile details/i)).toBeInTheDocument();
    expect(screen.getByText(/investment preferences, watchlist, and API access settings/i)).toBeInTheDocument();
    expect(screen.getByText(/account creation does not require payment information/i)).toBeInTheDocument();
    expect(screen.queryByText(/we collect payment information/i)).not.toBeInTheDocument();
  });

  it('uses the TickFlow brand consistently in the terms', () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>
    );

    expect(screen.getByText(/By using TickFlow Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/All content and code in TickFlow Intelligence/i)).toBeInTheDocument();
  });
});
