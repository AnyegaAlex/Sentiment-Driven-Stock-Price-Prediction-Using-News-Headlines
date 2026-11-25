import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/client', () => ({
  default: { post: vi.fn() },
  removeAuthToken: vi.fn(),
}));

import apiClient from '@/services/client';
import LegalAcceptanceGate from '../LegalAcceptanceGate';

describe('LegalAcceptanceGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not block the app until the backend reports legal acceptance is required', () => {
    render(<MemoryRouter><LegalAcceptanceGate /></MemoryRouter>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('recovers a legal-required response that arrived before the gate mounted', () => {
    window.__tickflowLegalAcceptanceRequired = true;
    render(<MemoryRouter><LegalAcceptanceGate /></MemoryRouter>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    window.__tickflowLegalAcceptanceRequired = false;
  });

  it('opens on the legal-required event with separate unticked controls', () => {
    render(<MemoryRouter><LegalAcceptanceGate /></MemoryRouter>);
    act(() => window.dispatchEvent(new CustomEvent('tickflow:legal-acceptance-required')));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /terms of service/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /privacy policy/i })).not.toBeChecked();
    expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('enables Continue only after both acknowledgements are checked', () => {
    render(<MemoryRouter><LegalAcceptanceGate /></MemoryRouter>);
    act(() => window.dispatchEvent(new CustomEvent('tickflow:legal-acceptance-required')));
    fireEvent.click(screen.getByRole('checkbox', { name: /terms of service/i }));
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /privacy policy/i }));
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
