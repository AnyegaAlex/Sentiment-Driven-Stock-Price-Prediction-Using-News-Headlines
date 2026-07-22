/**
 * Account Tab – Tickflow Sentiment
 * 
 * Manages account-level actions including deletion.
 * 
 * Features:
 * - Account deletion with confirmation
 * - Warning messages
 * - Input validation
 * - Dark mode support
 * - Accessibility
 * 
 * @component
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/services/client'; // ✅ Fixed import
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

// Constants
const CONFIRM_TEXT = 'DELETE';

const AccountTab = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ---- Helper: Redirect to Login ----
  const redirectToLogin = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // ---- Handle Account Deletion ----
  const handleDeleteAccount = async () => {
    // ✅ Validate password
    if (!password) {
      setError('Please enter your password to confirm');
      return;
    }

    // ✅ Validate confirmation text
    if (confirmText !== CONFIRM_TEXT) {
      setError(`Please type "${CONFIRM_TEXT}" to confirm`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/delete-account/', {
        password,
        confirm: confirmText,
      });

      // ✅ Success – redirect to login
      redirectToLogin();
    } catch (err) {
      // ✅ If 401, the account was deleted and token is invalid – treat as success
      if (err.response?.status === 401) {
        redirectToLogin();
        return;
      }

      // ✅ Handle other errors
      setError(err.response?.data?.error || err.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  // ---- Reset Dialog State ----
  const handleDialogOpenChange = (open) => {
    if (!open) {
      // Reset state when dialog closes
      setConfirmText('');
      setPassword('');
      setError('');
    }
    setIsDeleteDialogOpen(open);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Management</CardTitle>
        <CardDescription>
          Dangerous actions that affect your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delete Account Section */}
        <div className="p-6 rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
                Delete Account
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-red-700 dark:text-red-400 list-disc list-inside">
                <li>All your predictions and analysis will be permanently removed</li>
                <li>Your preferences and settings will be lost</li>
                <li>Your email will be removed from our system</li>
                <li>You will lose access to your API keys</li>
              </ul>
              <Button
                variant="destructive"
                className="mt-4"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Delete Account
              </DialogTitle>
              <DialogDescription>
                This action is permanent and cannot be undone. All your data will be lost.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This will permanently delete your account and all associated data.
                </AlertDescription>
              </Alert>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="delete-password">
                  Enter your password to confirm
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
              </div>

              {/* Confirmation Input */}
              <div className="space-y-2">
                <Label htmlFor="delete-confirm">
                  Type <span className="font-mono font-bold">{CONFIRM_TEXT}</span> to confirm
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="delete-confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={`Type ${CONFIRM_TEXT}`}
                  className="font-mono"
                  disabled={loading}
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="ml-2">{error}</span>
                </Alert>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogOpenChange(false)}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={
                    loading ||
                    confirmText !== CONFIRM_TEXT ||
                    !password
                  }
                  className="w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AccountTab;