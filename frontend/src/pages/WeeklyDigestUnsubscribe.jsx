import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '@/services/client';
import { Button } from '@/components/ui/button';

export default function WeeklyDigestUnsubscribe() {
  const [params] = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';
  const [state, setState] = useState('confirm');

  const unsubscribe = async () => {
    setState('submitting');
    try {
      await apiClient.post('/auth/weekly-digest/unsubscribe/', { uid, token });
      setState('success');
    } catch {
      setState('error');
    }
  };

  return (
    <main className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-950 p-8 text-white">
      <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">Tickflow Capital</p>
      <h1 className="text-2xl font-semibold">Weekly digest preferences</h1>
      {state === 'confirm' && (
        <>
          <p className="mt-4 text-gray-300">Stop receiving the optional weekly activity digest? This will not affect account, security or legal emails.</p>
          <Button className="mt-6 min-h-11 bg-white text-black hover:bg-gray-200" disabled={!uid || !token} onClick={unsubscribe}>Unsubscribe</Button>
          {(!uid || !token) && <p role="alert" className="mt-4 text-sm text-red-400">This unsubscribe link is incomplete. You can change the preference from account settings.</p>}
        </>
      )}
      {state === 'submitting' && <p role="status" className="mt-4 text-gray-300">Updating your preference…</p>}
      {state === 'success' && <p role="status" className="mt-4 text-gray-300">You are unsubscribed. We will not send further weekly digests unless you opt in again in account settings.</p>}
      {state === 'error' && <p role="alert" className="mt-4 text-red-400">We could not verify this link. You can turn off the weekly digest from account settings.</p>}
    </main>
  );
}
