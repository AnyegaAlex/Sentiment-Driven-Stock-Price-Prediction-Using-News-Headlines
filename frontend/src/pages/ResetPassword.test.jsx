import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthService from '@/services/authService';
import ResetPassword from './ResetPassword';

vi.mock('@/services/authService', () => ({
  default: { confirmPasswordReset: vi.fn() },
}));

const renderResetPassword = (entry = '/reset-password?token=valid-token&uid=encoded-user') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<h1>Request a new reset link</h1>} />
        <Route path="/login" element={<h1>Sign in</h1>} />
      </Routes>
    </MemoryRouter>
  );

describe('ResetPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submits the token, uid and matching new password', async () => {
    const user = userEvent.setup();
    AuthService.confirmPasswordReset.mockResolvedValueOnce({ success: true });

    renderResetPassword();

    await user.type(screen.getByLabelText('New password'), 'StrongerPass123!');
    await user.type(screen.getByLabelText('Confirm new password'), 'StrongerPass123!');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(AuthService.confirmPasswordReset).toHaveBeenCalledWith(
      'valid-token',
      'encoded-user',
      'StrongerPass123!',
      'StrongerPass123!'
    );
    expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login');
  });

  it('does not call the API when the reset link is missing token details', async () => {
    renderResetPassword('/reset-password');

    expect(screen.getByRole('alert')).toHaveTextContent(/link is incomplete/i);
    expect(screen.getByRole('link', { name: 'Request a new reset link' })).toHaveAttribute('href', '/forgot-password');
    expect(AuthService.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('explains when the two password entries do not match', async () => {
    const user = userEvent.setup();

    renderResetPassword();

    await user.type(screen.getByLabelText('New password'), 'StrongerPass123!');
    await user.type(screen.getByLabelText('Confirm new password'), 'DifferentPass123!');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
    expect(AuthService.confirmPasswordReset).not.toHaveBeenCalled();
  });
});
