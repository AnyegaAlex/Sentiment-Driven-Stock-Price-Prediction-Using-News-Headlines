import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const postMock = vi.fn();
vi.mock('@/services/client', () => ({
  default: { post: (...args) => postMock(...args) },
  removeAuthToken: vi.fn(),
}));

import LegalAcceptanceGate from '../LegalAcceptanceGate';

const renderGate = () =>
  render(
    <MemoryRouter>
      <LegalAcceptanceGate />
    </MemoryRouter>
  );

describe('LegalAcceptanceGate', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('portals the dialog to document.body so no ancestor can clip it', async () => {
    renderGate();
    act(() => { window.dispatchEvent(new CustomEvent('tickflow:legal-acceptance-required')); });
    const dialog = await screen.findByRole('dialog');
    // The dialog sits inside the fixed overlay, and the overlay is the portal root's child of body.
    expect(dialog.parentElement.parentElement).toBe(document.body);
  });

  it('stays hidden until the legal-required event fires', () => {
    renderGate();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens on the event and requires both boxes before continuing', async () => {
    renderGate();
    act(() => {
      window.dispatchEvent(new CustomEvent('tickflow:legal-acceptance-required'));
    });
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeTruthy();

    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    expect(continueBtn.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText(/Terms of Service/));
    expect(continueBtn.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText(/Privacy Policy/));
    expect(continueBtn.disabled).toBe(false);
  });

  it('posts only the two flags, never version fields', async () => {
    postMock.mockResolvedValue({ accepted: true });
    renderGate();
    act(() => {
      window.dispatchEvent(new CustomEvent('tickflow:legal-acceptance-required'));
    });
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByLabelText(/Terms of Service/));
    fireEvent.click(screen.getByLabelText(/Privacy Policy/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    expect(postMock).toHaveBeenCalledWith('/auth/legal/', {
      accept_terms: true,
      acknowledge_privacy_notice: true,
    });
  });

  it('stays a single dialog when many concurrent 403s arrive', async () => {
    renderGate();
    act(() => {
      for (let i = 0; i < 5; i += 1) {
        window.dispatchEvent(new CustomEvent('tickflow:legal-acceptance-required'));
      }
    });
    const dialogs = await screen.findAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
  });

  it('does not reopen after a successful acceptance, even for late 403s', async () => {
    postMock.mockResolvedValue({ accepted: true });
    const reload = vi.fn();
    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, reload, assign: vi.fn() };

    try {
      renderGate();
      act(() => {
        window.dispatchEvent(new CustomEvent('tickflow:legal-acceptance-required'));
      });
      await screen.findByRole('dialog');
      fireEvent.click(screen.getByLabelText(/Terms of Service/));
      fireEvent.click(screen.getByLabelText(/Privacy Policy/));
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
      act(() => {
        window.dispatchEvent(new CustomEvent('tickflow:legal-acceptance-required'));
      });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(postMock).toHaveBeenCalledTimes(1);
    } finally {
      window.location = originalLocation;
    }
  });

  it('moves initial focus to the heading when opened', async () => {
    renderGate();
    act(() => {
      window.dispatchEvent(new CustomEvent('tickflow:legal-acceptance-required'));
    });
    await screen.findByRole('dialog');
    expect(document.activeElement.id).toBe('legal-gate-title');
  });

  it('keeps Tab inside the dialog', async () => {
    renderGate();
    act(() => {
      window.dispatchEvent(new CustomEvent('tickflow:legal-acceptance-required'));
    });
    const dialog = await screen.findByRole('dialog');
    const focusable = dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])');
    const last = focusable[focusable.length - 1];
    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(focusable[0]);
  });

  it('Escape does not log out; it explains why the dialog stays open', async () => {
    const { removeAuthToken } = await import('@/services/client');
    renderGate();
    act(() => {
      window.dispatchEvent(new CustomEvent('tickflow:legal-acceptance-required'));
    });
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('alert').textContent).toMatch(/must accept both documents/i);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(removeAuthToken).not.toHaveBeenCalled();
  });
});
