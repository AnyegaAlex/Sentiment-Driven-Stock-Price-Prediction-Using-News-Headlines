/**
 * Account Tab – Tickflow Intelligence
 * 
 * Manages account-level actions including deletion.
 * 
 * Features:
 * - Account deletion with confirmation
 * - Warning messages
 * - Input validation
 * - Dark mode only (brand compliant)
 * - Accessibility
 * 
 * @component
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/services/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    if (!password) {
      setError('Please enter your password to confirm');
      return;
    }

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

      redirectToLogin();
    } catch (err) {
      if (err.response?.status === 401) {
        redirectToLogin();
        return;
      }

      setError(err.response?.data?.error || err.message || 'Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Reset Dialog State ----
  const handleDialogOpenChange = (open) => {
    if (!open) {
      setConfirmText('');
      setPassword('');
      setError('');
    }
    setIsDeleteDialogOpen(open);
  };

  return (
    <Card className="bg-gray-900 border border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Account Management</CardTitle>
        <CardDescription className="text-gray-400">
          Dangerous actions that affect your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delete Account Section */}
        <div className="p-6 rounded-lg border-2 border-red-400/30 bg-red-400/10">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-red-400/20">
              <Trash2 className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400">
                Delete Account
              </h3>
              <p className="text-sm text-red-400/80 mt-1">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-red-400/70 list-disc list-inside">
                <li>All your predictions and analysis will be permanently removed</li>
                <li>Your preferences and settings will be lost</li>
                <li>Your email will be removed from our system</li>
                <li>You will lose access to your API keys</li>
              </ul>
              <Button
                variant="destructive"
                className="mt-4 min-h-[44px] bg-red-400 text-white hover:bg-red-400/80 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
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
          <DialogContent className="max-w-md border border-gray-800 bg-gray-900 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Delete Account
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                This action is permanent and cannot be undone. All your data will be lost.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert variant="destructive" className="border border-red-400/30 bg-red-400/10 text-red-400">
                <AlertTitle className="text-red-400">Warning</AlertTitle>
                <AlertDescription className="text-red-400/80">
                  This will permanently delete your account and all associated data.
                </AlertDescription>
              </Alert>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="delete-password" className="text-gray-300">
                  Enter your password to confirm
                  <span className="text-red-400 ml-1">*</span>
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
                  className="min-h-[44px] bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black"
                />
              </div>

              {/* Confirmation Input */}
              <div className="space-y-2">
                <Label htmlFor="delete-confirm" className="text-gray-300">
                  Type <span className="font-mono font-bold text-white">{CONFIRM_TEXT}</span> to confirm
                  <span className="text-red-400 ml-1">*</span>
                </Label>
                <Input
                  id="delete-confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={`Type ${CONFIRM_TEXT}`}
                  className="min-h-[44px] font-mono bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black"
                  disabled={loading}
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <Alert variant="destructive" className="border border-red-400/30 bg-red-400/10 text-red-400">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="ml-2 text-red-400">{error}</span>
                </Alert>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogOpenChange(false)}
                  disabled={loading}
                  className="w-full sm:w-auto min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:ring-gray-500 focus-visible:ring-offset-black"
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
                  className="w-full sm:w-auto min-h-[44px] bg-red-400 text-white hover:bg-red-400/80 focus-visible:ring-gray-500 focus-visible:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
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