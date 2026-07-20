/**
 * Security Tab – Tickflow Sentiment
 * 
 * Phase 1 implementation:
 * - Change password (fully functional)
 * - 2FA placeholder (future feature)
 * - Sessions placeholder (future feature)
 * 
 * All interactive elements that are not yet implemented are clearly disabled.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert } from '@/components/ui/alert';
import { Lock, Shield, Monitor, Clock, AlertCircle } from 'lucide-react';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal';

const SecurityTab = ({ user }) => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Sessions are mocked – this feature will be implemented in a later phase.
  // For now, the "Revoke" button is hidden; we only display the session list.
  const sessions = [
    {
      id: 1,
      device: 'Chrome on MacBook Pro',
      location: 'Nairobi, Kenya',
      last_active: '10 minutes ago',
      current: true,
    },
    {
      id: 2,
      device: 'Safari on iPhone 15',
      location: 'Nairobi, Kenya',
      last_active: '2 hours ago',
      current: false,
    },
    {
      id: 3,
      device: 'Firefox on Windows 11',
      location: 'New York, US',
      last_active: '3 days ago',
      current: false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>
          Manage your account security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {/* Two-Factor Authentication – placeholder (disabled) */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 opacity-75">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Coming soon – add an extra layer of security
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-gray-400 border-gray-300 dark:border-gray-600">
              Disabled
            </Badge>
            <Switch
              checked={is2FAEnabled}
              onCheckedChange={setIs2FAEnabled}
              disabled
              aria-label="Two-factor authentication (coming soon)"
            />
          </div>
        </div>

        {/* Active Sessions – display only (no Revoke) */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 mb-4">
            <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Active Sessions</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Devices signed in to your account
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-700">
                    <Monitor className="h-4 w-4 text-gray-500" />
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
                        {session.last_active}
                      </span>
                    </div>
                  </div>
                </div>
                {/* ✅ No Revoke button – not implemented yet */}
              </div>
            ))}
          </div>

          <Alert className="mt-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-700 dark:text-blue-300 ml-2">
              If you see a session you don't recognize, change your password immediately.
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