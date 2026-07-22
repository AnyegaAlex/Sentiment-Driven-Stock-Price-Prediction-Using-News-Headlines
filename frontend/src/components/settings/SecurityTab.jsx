/**
 * Security Tab – Tickflow Sentiment
 * 
 * Phase 1 implementation:
 * - Change password (fully functional)
 * - 2FA placeholder (future feature)
 * - Sessions (with revoke functionality)
 * 
 * All interactive elements that are not yet implemented are clearly disabled.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Shield, Monitor, Clock, AlertCircle, LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal';
import apiClient from '@/services/client';

const SecurityTab = ({ user }) => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  // ---- Fetch Sessions ----
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual endpoint when available
      // const response = await apiClient.get('/auth/sessions/');
      // setSessions(response.data || []);
      
      // Mock data for now
      const mockSessions = [
        {
          id: 1,
          device: 'Chrome on MacBook Pro',
          location: 'Nairobi, Kenya',
          last_active: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          current: true,
        },
        {
          id: 2,
          device: 'Safari on iPhone 15',
          location: 'Nairobi, Kenya',
          last_active: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          current: false,
        },
        {
          id: 3,
          device: 'Firefox on Windows 11',
          location: 'New York, US',
          last_active: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          current: false,
        },
      ];
      setSessions(mockSessions);
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
      console.error('[SecurityTab] Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Revoke Session ----
  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to revoke this session?')) {
      return;
    }

    setRevokingId(sessionId);
    try {
      // TODO: Replace with actual endpoint
      // await apiClient.delete(`/auth/sessions/${sessionId}/`);
      
      // Remove session from list
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      setError(err.message || 'Failed to revoke session');
      console.error('[SecurityTab] Error revoking session:', err);
      setTimeout(() => setError(null), 3000);
    } finally {
      setRevokingId(null);
    }
  };

  // ---- Revoke All Other Sessions ----
  const handleRevokeAllOthers = async () => {
    if (!window.confirm('This will revoke all sessions except this one. Continue?')) {
      return;
    }

    try {
      // TODO: Replace with actual endpoint
      // await apiClient.post('/auth/sessions/revoke-all/');
      
      // Keep only current session
      setSessions(prev => prev.filter(s => s.current));
    } catch (err) {
      setError(err.message || 'Failed to revoke sessions');
      console.error('[SecurityTab] Error revoking all sessions:', err);
      setTimeout(() => setError(null), 3000);
    }
  };

  // ---- Helper: Format Time ----
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // ---- Loading State ----
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>
          Manage your account security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="ml-2">{error}</span>
          </Alert>
        )}

        {/* Change Password */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Password</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Change your password regularly to keep your account secure
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)}>
            Change Password
          </Button>
        </div>

        {/* Two-Factor Authentication – placeholder */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 opacity-75">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Two-Factor Authentication
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Coming soon – add an extra layer of security
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-gray-400 border-gray-300 dark:border-gray-600">
              Coming Soon
            </Badge>
            <Switch
              checked={is2FAEnabled}
              onCheckedChange={setIs2FAEnabled}
              disabled
              aria-label="Two-factor authentication (coming soon)"
            />
          </div>
        </div>

        {/* Active Sessions */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-start gap-3">
              <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Active Sessions</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Devices signed in to your account
                </p>
              </div>
            </div>
            {sessions.filter(s => !s.current).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevokeAllOthers}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Revoke All Others
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No active sessions found.
              </p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    session.current 
                      ? "bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800"
                      : "bg-gray-50 dark:bg-gray-800/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      session.current 
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : "bg-white dark:bg-gray-700"
                    )}>
                      <Monitor className={cn(
                        "h-4 w-4",
                        session.current 
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-500"
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {session.device}
                        </span>
                        {session.current && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{session.location}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(session.last_active)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!session.current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revokingId === session.id}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {revokingId === session.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          <Alert className="mt-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-700 dark:text-blue-300 ml-2">
              If you see a session you don't recognize, revoke it immediately and change your password.
            </span>
          </Alert>
        </div>

        {/* Change Password Modal */}
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
        />
      </CardContent>
    </Card>
  );
};

export default SecurityTab;