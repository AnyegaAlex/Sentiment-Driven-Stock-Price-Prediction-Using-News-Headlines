import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConsentManager from './ConsentManager';
import { initializeConsentMode, updateAnalyticsConsent, trackPageView } from '@/utils/analytics';

vi.mock('@/utils/analytics', () => ({
  initializeConsentMode: vi.fn(),
  updateAnalyticsConsent: vi.fn(),
  trackPageView: vi.fn(),
}));

const renderConsentManager = () => render(
  <MemoryRouter>
    <ConsentManager />
  </MemoryRouter>
);

describe('ConsentManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('asks for a choice when no preference has been saved', () => {
    renderConsentManager();

    expect(screen.getByRole('complementary', { name: /cookie preferences/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject optional/i })).toBeInTheDocument();
    expect(initializeConsentMode).toHaveBeenCalledOnce();
    expect(updateAnalyticsConsent).not.toHaveBeenCalled();
  });

  it('stores a rejection and keeps analytics disabled', () => {
    renderConsentManager();

    fireEvent.click(screen.getByRole('button', { name: /reject optional/i }));

    expect(JSON.parse(localStorage.getItem('tickflow_consent_v1')).analytics).toBe(false);
    expect(updateAnalyticsConsent).toHaveBeenCalledWith(false);
    expect(trackPageView).not.toHaveBeenCalled();
    expect(screen.queryByRole('complementary', { name: /cookie preferences/i })).not.toBeInTheDocument();
  });

  it('loads consented analytics only after the visitor accepts', () => {
    renderConsentManager();

    fireEvent.click(screen.getByRole('button', { name: /accept all/i }));

    expect(JSON.parse(localStorage.getItem('tickflow_consent_v1')).analytics).toBe(true);
    expect(updateAnalyticsConsent).toHaveBeenCalledWith(true);
    expect(trackPageView).toHaveBeenCalledWith('/');
  });

  it('allows the visitor to customize analytics and reopen preferences', () => {
    renderConsentManager();

    fireEvent.click(screen.getByRole('button', { name: /customize/i }));
    expect(screen.getByRole('dialog', { name: /privacy preferences/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /analytics/i }));
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    expect(JSON.parse(localStorage.getItem('tickflow_consent_v1')).analytics).toBe(true);
    expect(updateAnalyticsConsent).toHaveBeenCalledWith(true);

    act(() => {
      window.dispatchEvent(new Event('tickflow:open-consent-settings'));
    });
    expect(screen.getByRole('dialog', { name: /privacy preferences/i })).toBeInTheDocument();
  });

  it('returns to the initial banner if customization is cancelled before a choice', () => {
    renderConsentManager();

    fireEvent.click(screen.getByRole('button', { name: /customize/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.getByRole('complementary', { name: /cookie preferences/i })).toBeInTheDocument();
  });
});
