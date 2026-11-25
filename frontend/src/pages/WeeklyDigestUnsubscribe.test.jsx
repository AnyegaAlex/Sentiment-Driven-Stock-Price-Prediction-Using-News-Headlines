import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/services/client';
import WeeklyDigestUnsubscribe from './WeeklyDigestUnsubscribe';

vi.mock('@/services/client', () => ({ default: { post: vi.fn() } }));

function renderPage(entry = '/unsubscribe-weekly-digest?uid=MQ&token=valid-token') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/unsubscribe-weekly-digest" element={<WeeklyDigestUnsubscribe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('WeeklyDigestUnsubscribe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks for confirmation and submits the signed token', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Unsubscribe' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/weekly-digest/unsubscribe/',
      { uid: 'MQ', token: 'valid-token' }
    ));
    expect(await screen.findByText(/You are unsubscribed/)).toBeInTheDocument();
  });

  it('does not submit an incomplete link', () => {
    renderPage('/unsubscribe-weekly-digest');
    expect(screen.getByRole('button', { name: 'Unsubscribe' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/incomplete/);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('shows a recoverable message when the token is rejected', async () => {
    apiClient.post.mockRejectedValue(new Error('invalid'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Unsubscribe' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not verify/);
  });
});
