import React, { useState } from 'react';
import { api } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    new_password2: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (form.new_password !== form.new_password2) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/change-password/', {
        old_password: form.old_password,
        new_password: form.new_password,
        new_password2: form.new_password2,
      });
      setSuccess(true);
      setTimeout(() => {
        setForm({ old_password: '', new_password: '', new_password2: '' });
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border border-gray-800 bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Change Password</DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter your current password and choose a new one
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old_password" className="text-gray-300">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="old_password"
                type={showPasswords.old ? 'text' : 'password'}
                value={form.old_password}
                onChange={(e) => setForm({ ...form, old_password: e.target.value })}
                placeholder="Enter current password"
                required
                className="min-h-[44px] bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={showPasswords.old ? 'Hide password' : 'Show password'}
              >
                {showPasswords.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password" className="text-gray-300">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPasswords.new ? 'text' : 'password'}
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                placeholder="Enter new password"
                required
                minLength={8}
                className="min-h-[44px] bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={showPasswords.new ? 'Hide new password' : 'Show new password'}
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">Password must be at least 8 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password2" className="text-gray-300">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="new_password2"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={form.new_password2}
                onChange={(e) => setForm({ ...form, new_password2: e.target.value })}
                placeholder="Confirm new password"
                required
                className="min-h-[44px] bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={showPasswords.confirm ? 'Hide confirmation' : 'Show confirmation'}
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="border border-red-400 bg-red-400/10 text-red-400">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="ml-2">{error}</span>
            </Alert>
          )}

          {success && (
            <Alert className="border border-green-400 bg-green-400/10 text-green-400">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="ml-2 text-green-400">
                Password changed successfully!
              </span>
            </Alert>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:ring-gray-500 focus-visible:ring-offset-black"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-h-[44px] bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordModal;