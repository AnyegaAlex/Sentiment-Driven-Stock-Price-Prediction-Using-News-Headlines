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
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old_password">Current Password</Label>
            <div className="relative">
              <Input
                id="old_password"
                type={showPasswords.old ? 'text' : 'password'}
                value={form.old_password}
                onChange={(e) => setForm({ ...form, old_password: e.target.value })}
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPasswords.new ? 'text' : 'password'}
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                placeholder="Enter new password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">Password must be at least 8 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password2">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="new_password2"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={form.new_password2}
                onChange={(e) => setForm({ ...form, new_password2: e.target.value })}
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="animate-slide-down">
              <AlertCircle className="h-4 w-4" />
              <span className="ml-2">{error}</span>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 animate-slide-down">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="ml-2 text-green-700 dark:text-green-400">
                Password changed successfully!
              </span>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordModal;