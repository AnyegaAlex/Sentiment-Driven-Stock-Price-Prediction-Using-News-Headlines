import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Navbar from './Navbar';

describe('public navigation interactions', () => {
  it('opens the mobile menu and restores focus when Escape closes it', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const openButton = screen.getByRole('button', { name: 'Open navigation' });
    await user.click(openButton);

    expect(openButton).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('public-mobile-navigation').hidden).toBe(false);

    await user.keyboard('{Escape}');

    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveFocus();
    expect(document.getElementById('public-mobile-navigation').hidden).toBe(true);
  });

  it('closes the mobile menu after a navigation choice', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const signInLink = document.querySelector('#public-mobile-navigation a[href="/login"]');
    await user.click(signInLink);

    expect(document.getElementById('public-mobile-navigation').hidden).toBe(true);
  });

  it('closes the mobile menu after a click outside the navigation', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    await user.click(document.body);

    expect(document.getElementById('public-mobile-navigation').hidden).toBe(true);
  });
});
