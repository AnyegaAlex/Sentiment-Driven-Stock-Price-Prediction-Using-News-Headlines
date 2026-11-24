/**
 * Security – only what the backend records:
 * - Password change (API)
 * - Account activity log (AuditLog: logins, failures, verification, password events)
 * - API keys you have issued, with last-used time
 * Login sessions are not tracked, so no session list is shown.
 */
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Activity, KeyRound } from 'lucide-react';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal';
import apiClient from '@/services/client';

const body = (res) => res?.data ?? res;

const formatWhen = (value) => {
  if (!value) return 'Never';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const SecurityTab = () => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [activity, setActivity] = useState(null);
  const [keys, setKeys] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [act, apiKeys] = await Promise.all([
          apiClient.get('/auth/activity/', { params: { limit: 10 } }),
          apiClient.get('/auth/api-keys/'),
        ]);
        if (cancelled) return;
        const actBody = body(act);
        setActivity(Array.isArray(actBody?.results) ? actBody.results : []);
        const keyBody = body(apiKeys);
        setKeys(Array.isArray(keyBody) ? keyBody : []);
      } catch (err) {
        if (!cancelled) setLoadError('Could not load account activity right now.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeKeys = (keys || []).filter((k) => k.is_active !== false);

  return (
    <Card className="bg-gray-900 border border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Security</CardTitle>
        <CardDescription className="text-gray-400">Password, account activity and API keys</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 p-4 rounded-lg border border-gray-800 bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-white">Password</h4>
              <p className="text-sm text-gray-400">Change your password. You need your current password.</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsPasswordModalOpen(true)}
            className="min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            Change Password
          </Button>
        </div>

        <div className="p-4 rounded-lg border border-gray-800 bg-gray-900">
          <div className="flex items-start gap-3 mb-3">
            <KeyRound className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-white">API keys</h4>
              <p className="text-sm text-gray-400">
                {keys === null ? 'Loading…' : `${activeKeys.length} active key${activeKeys.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
          {keys && keys.length > 0 && (
            <ul className="space-y-2">
              {keys.map((k) => (
                <li key={k.id} className="flex flex-wrap justify-between gap-2 text-sm text-gray-300 border-t border-gray-800 pt-2">
                  <span>{k.name} <span className="font-mono text-gray-500">{k.key_preview ? `…${k.key_preview}` : ''}</span></span>
                  <span className="text-gray-500">
                    {k.is_active === false ? 'Revoked' : `Last used: ${formatWhen(k.last_used)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-500 mt-3">Create or revoke keys in Settings → Developer.</p>
        </div>

        <div className="p-4 rounded-lg border border-gray-800 bg-gray-900">
          <div className="flex items-start gap-3 mb-3">
            <Activity className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-white">Recent account activity</h4>
              <p className="text-sm text-gray-400">Logins, failed logins and account changes</p>
            </div>
          </div>
          {loadError && <p className="text-sm text-red-400">{loadError}</p>}
          {!loadError && activity === null && <p className="text-sm text-gray-500">Loading…</p>}
          {activity && activity.length === 0 && <p className="text-sm text-gray-500">No activity recorded yet.</p>}
          {activity && activity.length > 0 && (
            <ul className="space-y-2">
              {activity.map((a, i) => (
                <li key={`${a.timestamp}-${i}`} className="flex flex-wrap justify-between gap-2 text-sm border-t border-gray-800 pt-2">
                  <span className="text-gray-300 capitalize">{String(a.action || '').replace(/_/g, ' ').toLowerCase()}</span>
                  <span className="text-gray-500">{formatWhen(a.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-500 mt-3">Login sessions and devices are not tracked yet, so none are listed.</p>
        </div>

        <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
      </CardContent>
    </Card>
  );
};

export default SecurityTab;
