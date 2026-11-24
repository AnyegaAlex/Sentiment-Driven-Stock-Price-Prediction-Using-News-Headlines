import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/authService', () => ({
  default: { resendVerification: vi.fn() },
}));
vi.mock('@/assets/Primary Icon White.svg', () => ({ default: 'logo.svg' }));

import AuthService from '@/services/authService';
import ResendVerification from './ResendVerification';

describe('ResendVerification error copy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the server retry interval after a rate-limited resend', async () => {
    const user = userEvent.setup();
    AuthService.resendVerification.mockResolvedValueOnce({
      success: false,
      code: 429,
      error: 'Too many requests',
      retryAfter: 37,
    });

    render(
      <MemoryRouter>
        <ResendVerification />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email address/i), 'reader@example.com');
    await user.click(screen.getByRole('button', { name: /send verification email/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please wait 37 seconds before trying again.'
    );
  });
});
