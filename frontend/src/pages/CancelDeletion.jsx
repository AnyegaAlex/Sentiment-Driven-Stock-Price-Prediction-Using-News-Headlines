import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '@/services/client';
import { Button } from '@/components/ui/button';

export default function CancelDeletion() {
  const [params] = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';
  const [state, setState] = useState('confirm');

  const cancelDeletion = async () => {
    setState('submitting');
    try {
      await apiClient.post('/auth/delete-account/cancel/', { uid, token });
      setState('success');
    } catch {
      setState('error');
    }
  };

  return (
    <main className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-950 p-8 text-white">
      <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">Tickflow Capital</p>
      <h1 className="text-2xl font-semibold">Cancel account deletion</h1>
      {state === 'confirm' && (
        <>
          <p className="mt-4 text-gray-300">If you cancel, your Tickflow Intelligence account will be reactivated and the scheduled deletion will stop.</p>
          <Button className="mt-6 min-h-11 bg-white text-black hover:bg-gray-200" disabled={!uid || !token} onClick={cancelDeletion}>Keep my account</Button>
          {(!uid || !token) && <p role="alert" className="mt-4 text-sm text-red-400">This cancellation link is incomplete. Contact support if you need help.</p>}
        </>
      )}
      {state === 'submitting' && <p role="status" className="mt-4 text-gray-300">Restoring your account…</p>}
      {state === 'success' && <p role="status" className="mt-4 text-gray-300">Your account deletion has been cancelled. You can sign in again.</p>}
      {state === 'error' && <p role="alert" className="mt-4 text-red-400">This link could not be verified or the 30-day grace period has ended. Contact support if you need help.</p>}
    </main>
  );
}
