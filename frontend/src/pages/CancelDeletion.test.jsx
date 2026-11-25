import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/services/client';
import CancelDeletion from './CancelDeletion';

vi.mock('@/services/client', () => ({ default: { post: vi.fn() } }));

function renderPage(entry = '/cancel-deletion?uid=MQ&token=valid-token') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/cancel-deletion" element={<CancelDeletion />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CancelDeletion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('restores an account using the signed email link without login', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Keep my account' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/delete-account/cancel/',
      { uid: 'MQ', token: 'valid-token' }
    ));
    expect(await screen.findByText(/deletion has been cancelled/)).toBeInTheDocument();
  });

  it('does not submit an incomplete link', () => {
    renderPage('/cancel-deletion');
    expect(screen.getByRole('button', { name: 'Keep my account' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/incomplete/);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('explains when a cancellation link cannot be verified', async () => {
    apiClient.post.mockRejectedValue(new Error('expired'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Keep my account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/grace period has ended/);
  });
});
